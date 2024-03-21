/*
 * Package Loader from the repositories
 *
 * How it works:
 * - the repolist defines the search order in known repositories
 * - the first 'directory' in the path of the url may be a module
 * - check
 *   - is it already a known module
 *   - find in the module list of any repo entry in the repo list/entry order
 * - referrer check from which module the 'import' is requested
 *   - if the requesting module has a 'component.mjs' check for the required version
 *   - maintain a component mapping for each module/component
 * - load the module archive if not available
 *   - get the source (archive) for the required version
 *   - get/open cache for repo
 *   - load archive items as [module-version-location-entry, response] pairs to the cache
 * - adjust the request url with the requried version
 *   - the version will be added to the modulename with '@' (e.g. 'module1.0.0')
 *   - if no version '@latest' will be used
 * - return response from cache (or nothing if not found)
 *
 * todo [OPEN]:
 *  - store current state as Response in PRIVATE cache
 *    - restore state at start
 *    - maintain state
 *  - add non 'https:' sources
 *    - ipfs, torrent, ...
 *  - signatures
 *    - check signature of repository entry with repository hosts pubkey
 *    - check signature of archive with publishers pubkey
 *  - handle 'component.mjs'
 *    - get referrer module
 *    - get version from 'component.mjs' to referenced module
 *  - if path is directory, provide entries
 *    - put as Response to the cache while loading
 *  - implement cache update
 *    - add detected updates to the repo updates list
 *    - some updates can run automatically if permitted ba the user
 *    - for all other updates notify/ask user (user can select, gets warning if a version is needed)
 *    - load updates to cache
 *    - reload app after updates done
 *
 * @author: blukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

//
// debug
//

//
// archive queue
//

let archiveQ = [];

//
// repository
//

let REPOSITORYLIST = {};   // see puls REPOLIST
let knownmodules = {};
let repolistener;

const SEMVER_LENGTH = 3;

// helper functions

function normalizeVersion(version) {
    const parts = version.split('.');
    for (let i=parts.length; i<SEMVER_LENGTH; i++) parts[i] = '0';
    return parts.join('.');
}

function repolistGetModule(modulename, version) {
    let moduleversion;
    Object.entries(REPOSITORYLIST).find(([reponame, repoentries]) =>
      Object.entries(repoentries).find(([entryname, entry]) => {
          if (!entry.versions) return;
          let sversion = version ?? entry.latest;   // todo [OPEN]: if no 'latest', get the latest by semVer
          return Object.entries(entry.versions).find(([version, spec]) => {
              if (spec.modules.includes(modulename)) {
                  moduleversion   = { version, spec };
                  let modulespecs = knownmodules[modulename];
                  if (!modulespecs) modulespecs = knownmodules[modulename] = { name: modulename, repo: reponame, latest: entry.latest };
                  modulespecs.latest = entry.latest;
                  modulespecs[version] = moduleversion;
                  return (!sversion || sversion === version);
              }
          })
      })
    )
    return moduleversion;
}

function getModuleName(url) {
    const pathname   = url instanceof URL ? url.pathname : url;
    const i          = pathname.indexOf('/',1);
    let   modulename = i > -1
                        ? pathname.substring(1,i)
                        : pathname.substring(1);
    modulename = modulename.endsWith('!') ? modulename.slice(0,-1) : modulename;
    return modulename;
}

function getModuleNameVersion(url) {
    const modulename = getModuleName(url);
    const i = modulename.indexOf('@');
    return {
        modulename   : (i > -1) ? modulename.substring(0,i) : modulename,
        moduleversion: (i > -1) ? normalizeVersion(modulename.substring(i+1)) : undefined
    }
}

function getLatestVersion(modulename) {
    let modulespec = knownmodules[modulename];
    if (!modulespec) modulespec = repolistGetModule(modulename);
    if (!modulespec) return;
    return modulespec.latest;
}

function parseSemver (modulename) {
    const parts = modulename.split('@');

    if (parts[0] === '') {
        parts.shift();
        parts[0] = '@' + parts[0];
    }

    let name = parts[0];
    let version = parts[1] || '';
    let range = /*semver.validRange(version) ||*/ '';       // todo [OPEN]: include semver parsing and checks

    let ver = version.replace(/^[^0-9]+/, '');
    return {
        name: name,
        range: range,
        version: ver.length === 0 ? 'latest' : ver,
        original: version
    }
}

function getModule4ReferrerVersion(request, rversion) {
    if (rversion) rversion = normalizeVersion(rversion);
    const referrer = new URL(request.referrer);
    const { modulename, moduleversion } = getModuleNameVersion(referrer); // contains version already!
    // must be in know modules!
    const modulespec = knownmodules[modulename];
    // get 'component.mjs' see in 'dependencies'
    // check if the requested module is declared and use version
    // module may be renamed
    // otherwise use @latest
}


function versionRegex(modulename) {
    return new RegExp(`^/${modulename}`);
}

function hasVersion(request) {
    return request.url.indexOf('@') > -1;
}

function adjustVersion(request, rversion) {
    if (request.url.indexOf('@') > -1) return request.url;  // todo [OPEN]: better semantic parsing, '@' may occur in the filename also
    const url = new URL(request.url);
    const { modulename, moduleversion } = getModuleNameVersion(url);
    const version = moduleversion ? normalizeVersion(moduleversion) : rversion ? normalizeVersion(rversion) : getLatestVersion(modulename);
    const reference = url.pathname.replace(versionRegex(modulename), `/${modulename}@${version}`);
    return reference;
}

//
// archives & cache
//

async function openRepoCache(reponame) {
    const repo = REPOSITORYLIST[reponame];
    if (!repo) return;  // open a cache only for defined repositories
    return getRepoCache(repo, reponame);
}

async function getRepoCache(repo, reponame) {
    let cache = repo.cache;
    if (!cache) cache = repo.cache = await caches.open(reponame);
    return cache;
}

async function isModuleInCache(reponame, modulename, moduleversion) {
    let cache = await openRepoCache(reponame);
    let res = await cache.match(`/${modulename}@${moduleversion}`);
    return res != undefined;    // don't check res.ok because the response is a redirect which has status=301 and ok=false
}

async function clearCaches() {
    if (!REPOSITORYLIST) return;
    for await (const name of Object.keys(REPOSITORYLIST)) {
        await clearCache(name);
    }
    knownmodules = {};
}

async function clearCache(cachename) {
    // todo [OPEN]: maintain knownmodules, knownsouces
    delete REPOSITORYLIST[cachename].cache;
    await caches.delete(cachename);
}
/**
 *
 */
class RepoLoader extends Loader {

    constructor(repolist) {
        super();
        repolistener = (repolist) => this.repolistUpdated(repolist);
        repolistener(repolist);
        puls.addRepoListener(repolistener);
        this.isCaching = false;
    }

    canHandle(request) {
        return this.isResponsibleForModule(request);
    }

    //
    // loader implementation
    //

    async doStart() { return super.doStart() }  // nothing to do
    async doStop() {}  // nothing to do

    async doFetch(request) {
        const rversion = getModule4ReferrerVersion(request);
        if (!hasVersion(request)) {
            const reference = adjustVersion(request, rversion);
            const redirect  = Response.redirect(reference, 301);    // 301: permanently moved, 302: temporarily moved
            return redirect;
        }
        debuglog("RepoLoader> fetch", request.url, "referrer version", rversion);
        let response;
        response = await this.fromCache(request, rversion);
        if (response) {
            debuglog("RepoLoader > found in cache", request.url);
        } else {
            response = await this.loadAndCache(request, rversion);
            if (response) {
                debuglog("RepoLoader > load archive and cache", request.url);
            } else {
                response = this.notFound(request);
                debuglog("RepoLoader > not found", request.url);
            }
        }
        /*
                    let response = await this.fromCache(request, rversion)
                                   ?? await this.loadAndCache(request, rversion)
                                   ?? this.notFound(request);
            */
        return response;
    }

    notFound(request) {
        return Response.error();
    }

    //
    // repository & cache handling
    //

    repolistUpdated(repolist) {
        REPOSITORYLIST = repolist;
        // todo [OPEN]: check if the app needs to be updated (reloaded)
        // todo [OPEN]: maintain 'knownmodules': some modules may be removed
    }

    isResponsibleForModule(request) {
        const url = new URL(request.url);
        const { modulename, moduleversion } = getModuleNameVersion(url);
        if (!modulename) return false;
        return modulename in knownmodules || repolistGetModule(modulename) != undefined;
    }

    async fromCache(request, rversion) {
        const reference = adjustVersion(request, rversion);
        if (!reference) return;
/*
        const { modulename, moduleversion } = getModuleNameVersion(request.url);
        let   modulespec = knownmodules[modulename];
        if (!modulespec) modulespec = getModule4ReferrerVersion(request, rversion);
        if (!modulespec) return;
        rversion = rversion ?? moduleversion ?? modulespec.latest;   // todo [OPEN]: if no 'latest', get the latest by semVer
        const cache   = await openRepoCache(modulespec.repo);
        const response = await cache?.match(reference);
        return response;
*/
        // don't use caches.match(). cache lookup must be in the right sequence
        for await (const [reponame, repo] of Object.entries(REPOSITORYLIST)) {
            const cache = await getRepoCache(repo, reponame);
            const response = await cache?.match(reference);
            if (response) return response;
        }
    }

    /*async*/ loadAndCache(request, rversion) {
        return new Promise(async (resolve, reject) => {
            try {
                const url                           = new URL(request.url);
                const { modulename, moduleversion } = getModuleNameVersion(url);
                let modulespec                      = knownmodules[modulename];
                if (!modulespec) modulespec = getModule4ReferrerVersion(request, rversion);
                rversion        = rversion ?? moduleversion ?? modulespec.latest;   // todo [OPEN]: if no 'latest', get the latest by semVer
                const reponame  = modulespec.repo;
                const sources   = modulespec[rversion].spec.sources;
                const pathname  = url.pathname;
                const reference = pathname.indexOf('@') > -1 ? pathname : pathname.replace(`/${modulename}`, `/${modulename}@${rversion}`); // todo [OPEN]: semantic parsing. the '@' may also be in a filename
                if (await isModuleInCache(reponame, modulename, moduleversion)) { /*isAnySourceLoaded(sources)*/
                    if (this.isCaching) {
                        archiveQ.push(async () => {
                            try {
                                debuglog("RepoLoader > get module while caching, fetching again", modulename, moduleversion);
                                const response = await this.fetch(request);
                                resolve(response);
                            } catch (e) {
                                reject(e);
                            }
                        });
                    } else {
                       debuglog("RepoLoader > module was loaded, fetching again", modulename, moduleversion);
                        const cache    = await openRepoCache(modulespec.repo);
                        const response = await cache.match(reference);
                        resolve(response);
                    }
                    // resolve();
                } else {
                    this.isCaching = true;
                    // sourceLoaded(sources);
                    debuglog("RepoLoader > load source for module", modulename, moduleversion);
                    const start   = Date.now();
                    const archive = await this.loadAnySource(sources);
                    if (!archive) {
                        resolve();
                    } else {
                        debuglog("***> now cache entries", sources[0], Date.now() - start);
                        const response = await this.deflateAndCache(reference, archive, modulespec, rversion);
                        debuglog("***> sources cached", sources[0], Date.now() - start);
                        resolve(response);
                    }
                }
            } catch (e) {
                reject(e);
            } finally {
                this.isCaching = false;
                const q = archiveQ;
                archiveQ = [];
                for await (const fn of q) {
                    await fn();
                }
            }
        })
    }

    async deflateAndCache(reference, archive, modulespec, version) {
        const entries = await this.getZipEntries(archive);
        const cache   = await openRepoCache(modulespec.repo);
        version = modulespec.version ?? version;
        // todo [OPEN]: validate archive signature
        let structure = {};
        let directories = {};
        let archivespec;
        for await (const entry of entries) {
            if (entry.directory) continue;
            if (entry.filename === 'etc/archive.json') {
                archivespec = entry;
            } else {
                let location = this.buildLocation(entry.filename, version);
                this.maintainDirectories(location, entry, directories);
                this.maintainStructure(location, entry, structure, version);
                await this.cacheEntry(location, entry, version, cache);
            }
        }
        // this.reduceDirectories(directories,structure);
        this.cacheDirectories(directories, cache);
        this.cacheStructure(structure, cache);

        // todo [OPEN]: build digets and check signature with publishers pubkey, check also repository signatue (before load)
        const response = await cache.match(reference);
        return response;
    }

    cacheDirectories(directories, cache) {
        Object.entries(directories).forEach(([dir, entries]) => {
            let data = JSON.stringify(entries, undefined, 3);
            let response = new Response(data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            cache.put(dir, response);
        })
    }

    cacheStructure(structure, cache) {
        Object.entries(structure).forEach(([root, entries]) => {
            let data = JSON.stringify(entries, undefined, 3);
            let response = new Response(data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            cache.put(root+'!', response);
        })
    }

    reduceDirectories(directories,structure) {
        Object.keys(structure).forEach((root) => {
            delete directories[root];
        });
    }

    maintainDirectories(location, zipentry, directories) {
        const parts = location.split('/');
        parts.shift();                              // remove the training '/' which causes an empty item
        const root = parts.shift();                 // the module directory
        const file = parts.pop();                   // this is the file (in any case, because in our zip's are no empty directories)
        if (parts.length === 0) return;             // the root directory will be provided as whole structure -> maintainStructure()
        let prev = root;
        let entry;
        parts.forEach((part) => {
            let dir = '/' + prev + '/' + part;
            entry   = directories[dir];
            if (!entry) entry = directories[dir] = {
                path     : dir,
                name     : part,
                type     : "dir",
                birthtime: zipentry.lastModDate,
                ctime    : zipentry.lastModDate,
                mtime    : zipentry.lastModDate,
                atime    : zipentry.lastModDate,
                size     : zipentry.uncompressedSize,
                entries  : []
            }
            if (prev !== root) directories[prev]?.entries.push('dir:' + part);
            prev += '/' + part;
        });
        entry?.entries.push('file:' + file);
    }

    maintainStructure(location, zipentry, structure, version) {
        const i = location.indexOf('/',1);  // root directory of module
        const root = location.substring(1,i);
        const sub  = location.substring(i+1);
        const parts = sub.split('/');
        let entries = structure[root];
        if (!entries) entries = structure[root] = { _: "flat", version };
        parts.pop();    // last element is the file, don't add as 'dir'
        let dirpath = '/' + root;
        parts.forEach((part) => {
            dirpath += '/' + part;
            entries[dirpath] = { name: part, path: dirpath, type: 'dir' };
        })
        entries[location] = { name: sub, path: location, type: 'file' };
    }

    // todo [OPEN]:
    //  - add other content systems (ipfs, torrent, ...)
    //  - if multiple sources try to get one of it
    async loadAnySource(sources) {
        try {
            if (sources.length < 1) return;
            let res = await fetch(new Request(sources[0], { method: 'GET' }));
            if (!res.ok) return;
            let archive = await res.arrayBuffer();
            return archive;
        } catch (e) {
            console.log(e);
        }
    }

    getZipEntries(pkg) {
        return new Promise(async (resolve, reject) => {
            try {
                let zipreader = await this.createZipReader(pkg);
                zipreader.getEntries(resolve);
            } catch (e) {
                reject(e);
            }
        });
    }

    createZipReader(pkg) {
        return new Promise((fulfill, reject) => {
            zip.createReader(new zip.ArrayBufferReader(pkg), fulfill, reject);
        });
    }

    buildLocation(filename, version) {
        if (!version || version === 'undefined') {
            debugger;
        }
        filename = '/' + filename;
        const modulename = getModuleName(filename);
        return filename.replace(versionRegex(modulename), `/${modulename}@${version}`);
    }

    getEntryData(entry) {
        return new Promise((resolve, reject) => {
            try {
                entry.getData(new zip.BlobWriter(), resolve);
            } catch (e) { reject(e); }
        })
    }

    async cacheEntry(location, entry, version, cache) {
        if (entry.directory) return;    // just files, no directories to the cache
        let data     = await this.getEntryData(entry);
        // special handling of root modules ('index.mjs')
        // this must be a redirect to maintain the directory (module) structure!
        // otherwise relative path of 'import' is one level too high
        if (entry.filename.endsWith('index.mjs')) {
            const redirlocation = location.substr(0, location.length-('index.mjs'.length+1))
            const redirect = Response.redirect(location, 301);    // 301: permanently moved, 302: temporarily moved
            cache.put(redirlocation, redirect);
        }
        let response = new Response(data, {
            headers: {
                'Content-Type': puls.getContentType(entry.filename)
            }
        });
        return cache.put(location, response);
    }

    //
    // caches handling
    //

    async clearCaches() {
        await clearCaches();
    }

    async clearCache(cachename) {
        await clearCache(cachename);
    }
}

(async () => await puls.useLoader(new RepoLoader(puls.repolist), { priority: 0 , cache: true }) )()
