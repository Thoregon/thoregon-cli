/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import fs, { promises as pfs } from '/fs';
import path                    from '/path';
import process                 from '/process';

import ZipUtil                 from "../zip/ziputil.mjs";
import minimatch               from '/minimatch';

import { ensureDir, isDirectory, isFile }                 from "../fsutils.mjs";
import { installDependencies, installModuleDependencies } from "../loaderutil.mjs";
import { ErrAgentNotFound, ErrIdentityNotFound }          from "../errors.mjs";

import RepositorySource       from "/thoregon.archetim/lib/repository/repositorysource.mjs";

const rnd = (l) =>  btoa( String.fromCharCode( ...crypto.getRandomValues(new Uint8Array(l ?? 32)) ) ).replaceAll(/[\/|+|=]/g,'').substring(0, l ?? 32);

const THOREGON_DIST  = './dist/thoregon';
const PACKAGES_DIST  = './dist/packages';
const CONTAINER_DIST = './dist/containers';
const WWW_DIST       = './dist/www';
const TEMPLATES      = './templates';   // todo [REFACTOR]: use ../Puls.Container
const UITEMPLATES    = './templatesui';

const CONTAINER_STRUCT = [
    '.thoregon',
    '.bin',
    'modules',
    'data',
];

const UI_CONTAINER_STRUCT = [
    '.thoregon',
    'dist',
    'lib',
    'ext'
];

const AGENTEXCLUDES = [
    '*.md',
    '*.txt',
    '.git*',
    '*$.*',
    '**/node_modules/**',
    '**/doc/**',
    '**/test/**'
]

const UIEXCLUDES = [
    '*.md',
    '*.txt',
    '.git*',
    '*$.*',
    '**/doc/**',
    '**/test/**'
]

const include = (filepath, excludes) => !excludes || !(path.basename(filepath).startsWith('.')) && !(excludes.find((pattern) => minimatch(filepath, pattern, { matchBase: true })));

export default class ContainerBuilder {

    async create({ containername, identity, thoregon, dependencies, components = [], appagent } = {}) {
        const containerlocation = containername.startsWith('/') ? containername : path.join(CONTAINER_DIST, containername);

        await this.clearContainer(containerlocation);
        await this.ensureContainerStruct(containerlocation);

        const appconfig = appagent ? await this.getAppConfig(appagent) : [];
        components = await this.withAppComponents(appconfig, components);
        const agentsconfig = dependencies ? await this.getAgentsConfig(dependencies) : [];
        components = [ ...components, ...agentsconfig ];

        await this.extractThoregon(thoregon, containerlocation);
        const missing = await this.extractComponents(components, containerlocation);
        if (missing) return { dttm: new Date(), location: containerlocation, error: `Following components were not found: ${missing.join(", ")}`};

        await this.addTemplates(containerlocation);                     // add basic
        if (appagent) await this.adjustAppAgent(appagent, containerlocation, AGENTEXCLUDES);

        await this.addIdentity(containerlocation, identity);

        await this.packageConfig(containerlocation);
        await this.addPackageDependencies(containerlocation);

        return { dttm: new Date(), location: containerlocation, action: 'created container' };
    }

    async createUI({ containername, thoregon, components = [], app } = {}) {
        // create also a 'repos.mjs' with the entries from dist
        const containerlocation = containername.startsWith('/') ? containername : path.join(WWW_DIST, containername);

        await this.clearContainer(containerlocation);
        await this.ensureContainerStruct(containerlocation, UI_CONTAINER_STRUCT);

        const appconfig = await this.getAppConfig(app);
        components = await this.withAppComponents(appconfig, components);

        await this.addUIThoregon(thoregon, containerlocation);
        await this.addUIComponents(components, containerlocation);

        await this.addUITemplates(containerlocation);                     // add basic
        if (app) await this.adjustAppUI(app, containerlocation, UIEXCLUDES);

        await this.buildRepoEntries(containerlocation, components);

        return { dttm: new Date(), location: containerlocation, action: 'created UI container' };
    }

    async addUIThoregon(thoregon, containerlocation) {
        const filelocation = path.resolve(THOREGON_DIST, thoregon);
        const targetlocation = path.join(containerlocation, 'dist', thoregon);
        await pfs.cp(filelocation, targetlocation);
    }

    async addUIComponents(components, containerlocation) {
        if (!components) return;
        const targetlocation = path.join(containerlocation, 'dist');
        const repoentries = {}
        for await (const component of components) {
            const filelocation = path.resolve(PACKAGES_DIST, `${component}.zip`);
            const targetfile = path.join(targetlocation, `${component}.zip`);
            await pfs.cp(filelocation, targetfile);
            // add repo entries from package
        }

        return repoentries;
    }

    async buildRepoEntries(containerlocation, components) {
        const repos = { /*THOREGON: {}, NEULAND: {}, THATSME: {}*/ };

        const thoregon = await this.getRepoEntry(THOREGON_DIST, 'thoregonB');
        repos.THOREGON = thoregon;

        for await (const component of components) {
            const repo = await this.getRepoEntry(PACKAGES_DIST, component);
            if (!repo) continue;
            const source = repos[repo.name];
            if (source) {
                source.addAllEntries(repo);
            } else {
                repos[repo.name] = repo;
            }
        }

        const reposrc = Object.values(repos).map(source => source.asSource(4)).join(",\n");

        const content = `/**
 * root definition to find repositories
 *
 */

export default {
${reposrc}
}
`;

        const repofile = path.resolve(containerlocation, 'repos.mjs');
        await pfs.writeFile(repofile, content);

        return repos;
    }

    async getRepoEntry(distdir, component) {
        const ziplocation = path.resolve(distdir, `${component}.zip`);
        try {
            const archive = await ZipUtil.extractFileContent(ziplocation, 'etc/archive.json');
            if (!archive) return console.log(`No archive definition (etc/archive.json) for '${component}'`);
            const ref  = JSON.parse(archive).repo;
            if (!ref) return console.log(`No repository definition (archive.repo) for '${component}'`);
            const name = Object.keys(ref)[0];
            const repo = ref[name];
            if (!repo) return console.log(`No repository definition (archive.repo) for '${component}'`);
            const source = RepositorySource.fromObj(name, repo);
            Object.entries(source.entries).forEach(([name, entry]) => {
                // todo: the real version source must be used!!!
                const version100 = entry.versions.versions['1.0.0'];
                version100.sources = [`./dist/${component}.zip`];
            })
            return source;
        } catch (e) {
            console.log("Error reading archive definition", e);
        }
    }

    async clearContainer(containerlocation) {
        await pfs.rm(path.resolve(containerlocation), { recursive: true, force: true });
    }

    async ensureContainerStruct(containerlocation, struct = CONTAINER_STRUCT) {
        await ensureDir(containerlocation);
        for await (const dir of struct) {
            await ensureDir(path.join(containerlocation, dir));
        }
    }

    async getAgentsConfig(dependencies) {
        try {
            const appconfigfile = path.join(dependencies, 'agent.config.mjs');
            const appconfig = (await import(appconfigfile)).default;
            return appconfig ? appconfig.components : [];
        } catch (e) {
            console.error(e);
            // no app config, but can be ignored
        }
    }

    async getAppConfig(appagent) {
        try {
            const appconfigfile = path.join(appagent, 'app.config.mjs');
            const appconfig = (await import(appconfigfile)).default;
            return appconfig;
        } catch (e) {
            console.error(e);
            // no app config, but can be ignored
        }
    }

    /**
     * add components defined within the agent.
     * the
     * @param appagent
     * @param components
     */
    async withAppComponents(appconfig, components) {
        if (!appconfig?.components) return components;
        return [ ...components, ...appconfig.components ];
    }

    /**
     * add and override settings from app agent
     *
     * @param appagent
     * @param containerlocation
     * @returns {Promise<void>}
     */
    async adjustAppUI(app, containerlocation, excludes) {
        if (!app) return;
        if (!isDirectory(app)) throw new ErrAgentNotFound(app);
        await pfs.cp(app, containerlocation, { force: true, recursive: true, filter: (path) => include(path, excludes) });
    }

    /**
     * add and override settings from app agent
     *
     * @param appagent
     * @param containerlocation
     * @returns {Promise<void>}
     */
    async adjustAppAgent(appagent, containerlocation, excludes) {
        if (!appagent) return;
        if (!isDirectory(appagent)) throw new ErrAgentNotFound(appagent);
        await pfs.cp(appagent, containerlocation, { force: true, recursive: true, filter: (path) => include(path, excludes) });
    }

    async addComponents({ containername, identity, components = [] } = {}) {
        const containerlocation = containername.startsWith('/') ? containername : path.join(CONTAINER_DIST, containername);

        await this.ensureContainerStruct(containerlocation);
        const missing = await this.extractComponents(components, containerlocation);
        if (missing) return { dttm: new Date(), location: containerlocation, error: `Following components were not found: ${missing.join(", ")}`};
        await this.addPackageDependencies(containerlocation, components);

        return { dttm: new Date(), location: containerlocation, action: 'added components to container' };
    }

    async extractThoregon(thoregon, containerlocation) {
        const filelocation = path.resolve(THOREGON_DIST, thoregon);
        const extractlocation = path.join(containerlocation, 'modules');
        await ZipUtil.extractZIP(filelocation, extractlocation);
    }

    async extractComponents(components, containerlocation) {
        const missing = [];
        for await (const component of components) {
            if (!(await this.extractComponent(component, containerlocation))) missing.push(component);
        }
        return (missing.length > 0) ? missing : undefined;
    }

    async extractComponent(component, containerlocation) {
        const filelocation = path.resolve(PACKAGES_DIST, `${component}.zip`);
        try {
            const extractlocation = path.join(containerlocation, 'modules');
            await ZipUtil.extractZIP(filelocation, extractlocation);
            return true;
        } catch (e) {
            return false;
        }
    }

    async addTemplates(containerlocation) {
        await pfs.cp(path.resolve(TEMPLATES), path.resolve(containerlocation), { recursive: true/*, force: true */ });
    }

    async addUITemplates(containerlocation) {
        await pfs.cp(path.resolve(UITEMPLATES), path.resolve(containerlocation), { recursive: true/*, force: true */ });
    }

    async addIdentity(containerlocation, identity) {
        const identityfile = path.resolve(identity);
        if (!isFile(identityfile)) throw ErrIdentityNotFound(identity);
        await pfs.cp(identityfile, path.resolve(containerlocation, 'identity.mjs'));
    }

    async packageConfig(containerlocation) {
        try {
            const packagename = path.basename(containerlocation);
            const packagefile = path.resolve(containerlocation, 'package.json');
            const packagejson = JSON.parse(await pfs.readFile(packagefile));
            packagejson.name  = packagename;
            await pfs.writeFile(packagefile, JSON.stringify(packagejson, undefined, 2));
            return true;
        } catch (e) {
            // no package.json, resume w/o dependencies
        }
        return false;
    }

    async addPackageDependencies(containerlocation, components) {
        const packagename = path.basename(containerlocation);
        const packagefile = path.resolve(containerlocation, 'package.json');
        // now nmp install
        if (!components) {
            await installDependencies(containerlocation);
        } else {
            // todo: the 'component' may have another name or may be a multi package -> the 'extractComponent' must provide the names of the contained modules
            // for await (const component of components) await installModuleDependencies(path.join(containerlocation, component));
        }
    }

    //
    // ZIP handling
    //
/*
    async extractZIP(filelocation, containerlocation) {
        const content      = await pfs.readFile(filelocation);
        const entries      = await this.getZipEntries(content);
        const packlocation = path.join(containerlocation, 'modules');
        for await (const entry of entries) {
            const entryname = path.resolve(packlocation, entry.filename);
            await ensureDir(path.dirname(path.join(packlocation, entry.filename)));
            const data      = new DataView(await (await this.getEntryData(entry)).arrayBuffer());
            await pfs.writeFile(entryname, data);
        }
        console.log("ZIP");
    }

    createZipReader(pkg) {
        return new Promise((fulfill, reject) => {
            zip.createReader(new zip.ArrayBufferReader(pkg), fulfill, reject);
        });
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

    getEntryData(entry) {
        return new Promise((resolve, reject) => {
            try {
                entry.getData(new zip.BlobWriter(), resolve);
            } catch (e) { reject(e); }
        })
    }*/
}
