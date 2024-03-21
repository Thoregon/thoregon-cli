/**
 *
 * Loaders: can work with or w/o cache
 *
 * todo:
 *  - firewall transform streams -> Loader
 *  - widget loader (build widget script -> browserloader.sendWidgets)
 *  - multiple caches
 *      - thoregon system
 *      - component namespaces
 *
 * @author: blukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

importScripts('./lib/zip/zip.js');
importScripts('./lib/zip/inflate.js');
importScripts('./lib/zip/ArrayBufferReader.js');
zip.useWebWorkers = false;  // don't use separate workers, this is a worker

const DEV = {
    isDev: false,
    thoregon: 'prod' // 'dev'    // 'prod' uses thoregon system from (browser) cache from, if missing it's loaded from repo ; 'dev' loads also thoregon system via the dev server
}

const debuglog = (...args) => {};  // logentries.push({ dttm: Date.now(), ...args });  // console.log(...args);

// temp log
let logentries = [];

function getlog(filter) {
    return filter
           ? logentries.filter(filter)
           : logentries;
}

function clearlog() {
    logentries = [];
}

// const THOREGONPKG = './dist/thoregonB.zip';
// var CACHE = 'PULS';

// --- todo: use package 'mime-types' in future -> https://github.com/jshttp/mime-types
const contentTypesByExtension = {
    'css'  : 'text/css',
    'mjs'  : 'application/javascript',
    'js'   : 'application/javascript',
    'json' : 'application/json',
    'png'  : 'image/png',
    'jpg'  : 'image/jpeg',
    'jpeg' : 'image/jpeg',
    'html' : 'text/html',
    'htm'  : 'text/html',
    'svg'  : 'image/svg+xml',
    'woff' : 'application/font-woff',
    'woff2': 'font/woff2',
    'tty'  : 'font/truetype',
    'otf'  : 'font/opentype',
    'wasm' : 'application/wasm',
    'eot'  : 'application/vnd.ms-fontobject',
};

// todo [OPEN]:
//  - permitted access to add allowed web requests
//  - allow per method
const ALLOWED_WEB_REQUESTS = [
    /^https:\/\/dns\.google\/.*/,
    /^https:\/\/cloudflare-dns\.com\/.*/,
    /^https:\/\/.*\.ipfs\.io\/.*/,
    /^https:\/\/cloudflare-ipfs\.com\/.*/,
    /^https:\/\/.*\.thatsme\.plus\/.*/,
    /^https:\/\/.*\.broadcast\.green\/.*/,
    /^https:\/\/pioneersofchange-summit\.org\/.*/,
];

// todo [REFACTOR]: move to a repository
const SYMLINKS = {
    'https://thatsme.plus/wp-content/uploads/2020/12/logo.png'                              : '/ext/thatsmelogo.png',
    'https://fonts.googleapis.com/icon?family=Material+Icons'                               : '/ext/materialicons.css',
    'https://fonts.gstatic.com/s/materialicons/v85/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2': '/ext/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2',
}

const resolveSymlink = (url) => SYMLINKS[url];
const requestAllowed = (url) => !!ALLOWED_WEB_REQUESTS.find(location => url.match(location));

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

//
//
//

const REPOLIST = {};

/**
 *
 */
class Puls {

    constructor(props) {
        this.reset();
    }

    reset() {
        this._registry          = {};
        this.isDev              = DEV.isDev;
        this.devSettings        = DEV;
        this._devloader         = undefined;
        this._cachingloaders    = [];
        this._noncachingloaders = [];
        // other workers
        this._repolistlisteners = [];
    }

    async clearCache(cachename) {
        for await (const loader of this._cachingloaders) {
            await loader.clearCache(cachename);
        }
    }

    async clearAllCaches() {
        await this.clearCache();
        for await (const name of await caches.keys()) {
            await caches.delete(name);
        }
    }

    // async refreshThoregonCache() {
    //     delete this.cache;
    //     await this.clearCache(CACHE);
    //     await this.precache();
    // }

    async beat() {
        // todo:
        //  - open a cache for every repository in the list
        // this.cache = await caches.open(CACHE);
    }

    /*
     * cache and fetch
     */

    // async precache() {
    //     if (!this.cache) await this.beat()
    //     let res = await fetch(THOREGONPKG);
    //     let thoregonpkg = await res.arrayBuffer();
    //     let entries = await this.getZipEntries(thoregonpkg);
    //     // todo [OPEN]: validate archive signature -> need to pass 'genesis.mjs' from protouniverse to puls for pub keys
    //     await forEach(entries, async (entry) => {
    //         await this.cacheEntry(entry);
    //         // console.log("Cached>", entry.filename);
    //     })
    // }

    get repolist() {
        return REPOLIST;
    }


    // todo [REFACTOR]: this is a primitive and simple mime type matching. exchange by more sophisticated
    getContentType(filename) {
        if (!filename) return 'text/plain';
        if (filename === '/') return 'text/html';   // todo [REFACTOR]: implement better check if it is the entry point (thoregon.html)
        var tokens = filename.split('.');
        var extension = tokens[tokens.length - 1];
        return contentTypesByExtension[extension] ?? 'text/plain';
    }

    isPermitted(url) {
        return true;
        return (self.location.origin === new URL(url).origin)
               || requestAllowed(url);
    }

    /*
     * fetch
     */

    /**
     * ask all loaders for the requested resource
     *
     * todo
     *  - [OPEN]: match loaders with the clientId of the event, may be different
     *  - [OPEN]: maintain same request queue
     *
     *
     * check:
     *  - reject all requests not to: self.location.origin === new URL(request.url).origin
     *  - everthing else must be requested from matter (gun) or heavymatter (ipfs)
     *  - put also fetch from current location to cache
     */
    async fetch(event) {
        try {
            // if (!this.cache) await this.beat();
            let request = event.request;
            let symlink = resolveSymlink(request.url);      // todo: check method etc. if this request can really be redirected to a 'local' resource
            // enforce same origin in any case!
            if (symlink) {
                await event.respondWith((async () => {
                    debuglog("redirect symlink", request.url, symlink);
                    return Response.redirect(symlink, 301);
                })());
                return;
            }
            await event.respondWith((async () => {
                if (!this.isPermitted(request.url)) throw Error(`location not allowed (same origin) -> ${request.url}`);
                let pathname = onlyPath(request);
                let response;

                debuglog("> fetch start", request.url);

                // dev only
                if (this.isDev) {
                    response = await this.fetchDevLoader(request);
                    if (response) {
                        debuglog("< fetch dev loader", response.type, request.url);
                        return response;
                    }
                }

                // first lookup non caching loaders (mainly for dev and realtime)
                response = await this.fetchNonCaching(request);
                if (response) {
                    debuglog("< fetch non caching", response.type, request.url);
                    return response.type === 'error' ? undefined : response;
                }

                // not found in cache, lookup caching loaders
                response = await this.fetchCaching(request);
                if (response) {
                    debuglog("< fetch caching OK", response.type, request.url);
                    return response.type === 'error' ? undefined : response;
                }

                // Not found by any loader - return the result from a web server, but only if permitted
                // `fetch` is essentially a "fallback"
                response = await fetch(request);
                // save response in cache
                // todo [OPEN]
                //  - consider http cache headers
                //  - introduce refresh strategy when no headers
                // await this.cache.put(pathname, response.clone());
                if (!response) {
                    debuglog("< fetch not found", request.url);
                } else {
                    debuglog("< default fetch", response.type, request.url);
                }

                return response;
            })());
        } catch (e) {
            console.log("Fetch error:", event.request.url, e);
            // throw Error("Can't fetch");
        }
    }

    // dev loader has a special priority
    async fetchDevLoader(request) {
        let loader = this.getDevLoader();
        if (!this._devloader) return;
        debuglog("fetch dev", request.url);
        let response = await loader.fetch(request);
        return response;
    }

    async fetchNonCaching(request, i) {
        i = i || 0;
        if (this._noncachingloaders.length <= i) return;
        let loader = this._noncachingloaders[i];
        if (!loader) return this.fetchNonCaching(request, i+1);
        let response = await loader.fetch(request);
        return response || this.fetchNonCaching(request, i+1);
    }

    async fetchCaching(request, i) {
        i = i || 0;
        if (this._cachingloaders.length <= i) return;
        let loader = this._cachingloaders[i];
        if (!loader) return this.fetchNonCaching(request, i+1);
        let response = await loader.fetch(request);
        return response || this.fetchCaching(request, i+1);
    }

    /*
     * message relay
     */

    async handleMessage(evt) {
        const messageSource = evt.source;
        const data           = evt.data;
        const cmd            = data.cmd;

        switch (cmd) {
            case 'exists':
                let exists = !!this._registry[data.name];
                messageSource.postMessage({ cmd, exists, name: data.name });
                break;
            case 'loader':
                await this.addLoader(data);
                messageSource.postMessage({ cmd, "ack": true });
                break;
            case 'worker':
                break;
            case 'matter':
                //
                break;
            case 'state':
                // todo: add state of each loader
                messageSource.postMessage({ cmd, name: 'PULS', registry: this._registry, state: 'running' });
                break;
            case 'reset':
                this.reset();
                break;
            case 'clearCache':
                await this.clearCache(data.cache);
                messageSource.postMessage({ cmd, "ack": true });
                break;
            // case 'refreshThoregonCache':
            //     await this.refreshThoregonCache();
            //     messageSource.postMessage({ cmd, "ack": true });
            //     break;
            case 'inCache':
                messageSource.postMessage({ cmd: "inChache", inChache: await this.inCache(data.path) });
                break;
            case 'listCache':
                messageSource.postMessage({ cmd: "listCache", chache: await this.listCache() });
                break;
            case 'repo':
                const done = await this.maintainRepolist(data.settings);
                messageSource.postMessage({ cmd: "repo", "ack": done });
                break;
            case 'dev':
                this.devSettings = data.settings;
                const isDev = !!data.settings.isDev;
                if (this.isDev !== isDev) {     // todo [REFACTOR]: this is not correct! the devsettings should be propagated to the devloader anyways.
                    if (isDev) {
                        await this.resumeDevLoader(this.devSettings);
                    } else {
                        await this.pauseDevLoader();
                    }
                    this.isDev = isDev;
                } else {
                    await this.getDevLoader()?.use(this.devSettings);
                }
                messageSource.postMessage({ cmd, "ack": true });
                break;
        }
    }

    //
    // cache
    //

    //
    async inCache(path) {
        return false;
        // path = path.startsWith('/') ? '' : '/' + path;
        // const res = await puls.cache.match(self.location.origin + path);
        // return !!res;
    }

    async listCache() {
        return [];
        // const i = self.location.origin.length;
        // const entries = (await puls.cache.keys()).map(req => req.url.substr(i));
        // seems that cache entries does not provide any header or other useful information
        // const entries = (await puls.cache.keys()).map(req => {return { url: req.url.substr(i), contentType: req.headers.get('Content-Type'), redirected: req.redirected || false } });
        // return entries;
    }

    //
    // repos
    //
    // maintain a repository list. priority top down. the first definition of a module counts
    //

    async maintainRepolist(settings) {
        if (!settings) return;
        Object.entries(settings).forEach(([name, entries]) => {
            let repo = REPOLIST[name];
            if (!repo) repo = REPOLIST[name] = {};
            this.maintainRepoEntries(repo, entries);
        });
        // notify all listeners that repository list has been modified
        for await (const listener of this._repolistlisteners) {
            try {
                await listener(REPOLIST);
            } catch (e) {
                console.log("Repository List Listener Error:", e);
            }
        }
    }

    maintainRepoEntries(repo, entries) {
        Object.entries(entries).forEach(([modulename, settings]) => {
           repo[modulename] = settings;
        });
    }

    addRepoListener(fn) {
        this._repolistlisteners.push(fn);
    }

    removeRepoListener(fn) {
        this._repolistlisteners = this._repolistlisteners.filter((listener) => listener !== fn);
    }

    /*
     * Loaders
     */

    async addLoader(data) {
        let { name, kind, port, cache, priority } = data;
        let loader = new MsgPortLoader({ name, kind, port });
        this.useLoader(loader, { cache: cache || false, priority });
        // add to registry if no error  (throw)
        this._registry[name] = { name, kind, cache, priority };
    }

    /**
     * register a loader
     * only one loader per priority
     * first registered loader wins
     * registers and starts the loader
     * however, the loader starts async and may not be 'ready' when this method returns
     *
     * @param loader
     * @param priority
     * @param cache
     */
    async useLoader(loader, { priority, cache = true } = {}) {
        if (!loader) return;
        let q = cache ? this._cachingloaders : this._noncachingloaders;
        if (priority == undefined) priority = q.length;
        if (q[priority]) return;
        await loader.start();
        // add to loaders if no error (throw) at start
        q[priority] = loader;
    }

    //
    // Dev Loader
    //

    async useDevLoader(loader) {
        this._devloader = loader;
        if (this.isDev) {
            await loader.start(this.devSettings)
        } else {
            await loader.use(this.devSettings);
        }
    }

    async pauseDevLoader() {
        const devloader = this.getDevLoader();
        if (devloader) await devloader.pause();
    }

    async resumeDevLoader(settings) {
        const devloader = this.getDevLoader();
        if (!devloader) return;
        if (devloader.isReady()) {
            await devloader.resume(settings);
        } else {
            await devloader.start(settings);
        }
    }

    getDevLoader() {
        return this._devloader;
    }

    //
    // Repository Loader
    //

    pauseRepoLoader() {
        const devloader = this.getRepoLoader();
        if (devloader) devloader.pause();
    }

    resumeRepoLoader(settings) {
        const devloader = this.getRepoLoader();
        if (devloader) devloader.resume(settings);
    }

    getRepoLoader() {
        return puls._cachingloaders.find(loader => loader.constructor.name === 'RepoLoader');
    }}

self.puls = new Puls();

/*
 * now loaders can be defined get loaders
 */
importScripts('./lib/loaders/loader.js')
// importScripts('./tdev/tdevloader.js');
importScripts('./tdev/tdevloaderhttp.js');
importScripts('./lib/loaders/repoloader.js');
//importScripts('./lib/loaders/webloader.js');

// this loader may be reactivated in future
// importScripts('./ipfs/ipfsloader.js');
// importScripts('./lib/loaders/msgportloader.js');
// importScripts('./gun/gunloader.js');

