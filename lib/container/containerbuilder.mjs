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

import zip                     from '../zip/zip.js';
import Inflate                 from '../zip/inflate.js';
import ArrayBufferReader       from "../zip/ArrayBufferReader.js";
zip.useWebWorkers = false;  // don't use separate workers, this is a worker

import { ensureDir, getDirectories, isFile }              from "../fsutils.mjs";
import { installDependencies, installModuleDependencies } from "../loaderutil.mjs";
import { ErrIdentityNotFound }                            from "../errors.mjs";

const rnd = (l) =>  btoa( String.fromCharCode( ...crypto.getRandomValues(new Uint8Array(l ?? 32)) ) ).replaceAll(/[\/|+|=]/g,'').substring(0, l ?? 32);

const THOREGON_DIST  = './dist/thoregon';
const PACKAGES_DIST  = './dist/packages';
const CONTAINER_DIST = './dist/containers';
const TEMPLATES      = './templates';

const CONTAINER_STRUCT = [
    '.thoregon',
    '.bin',
    'modules',
    'data',
];

export default class ContainerBuilder {

    async create({ containername, identity, thoregon, components = [] } = {}) {
        const containerlocation = containername.startsWith('/') ? containername : path.join(CONTAINER_DIST, containername);

        await this.clearContainer(containerlocation);
        await this.ensureContainerStruct(containerlocation);

        await this.extractThoregon(thoregon, containerlocation);
        const missing = await this.extractComponents(components, containerlocation);
        if (missing) return { dttm: new Date(), location: containerlocation, error: `Following components were not found: ${missing.join(", ")}`};
        await this.addTemplates(containerlocation);
        await this.addIdentity(containerlocation, identity);
        await this.initIdentifiers(containerlocation);
        await this.packageConfig(containerlocation);
        await this.addPackageDependencies(containerlocation);

        return { dttm: new Date(), location: containerlocation, action: 'created container' };
    }

    async clearContainer(containerlocation) {
        await pfs.rm(path.resolve(containerlocation), { recursive: true, force: true });
    }

    async ensureContainerStruct(containerlocation) {
        await ensureDir(containerlocation);
        for await (const dir of CONTAINER_STRUCT) {
            await ensureDir(path.join(containerlocation, dir));
        }
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
        await this.extractZIP(filelocation, containerlocation);
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
            await this.extractZIP(filelocation, containerlocation);
            return true;
        } catch (e) {
            return false;
        }
    }

    async addTemplates(containerlocation) {
        await pfs.cp(path.resolve(TEMPLATES), path.resolve(containerlocation), { recursive: true/*, force: true */ });
    }

    async addIdentity(containerlocation, identity) {
        const identityfile = path.resolve(identity);
        if (!isFile(identityfile)) throw ErrIdentityNotFound(identity);
        await pfs.cp(identityfile, path.resolve(containerlocation, 'identity.mjs'));
    }

    async initIdentifiers(containerlocation) {
        const containername = path.basename(containerlocation);

        // replace known identifiers
        const configfile = path.resolve(containerlocation, 'universe.config.mjs')
        let config       = await pfs.readFile(configfile, 'utf8');
        config           = config.replaceAll('${agentname}', containername);
        await pfs.writeFile(configfile, config);

        const peerfile = path.resolve(containerlocation, 'peer.mjs')
        let peer       = await pfs.readFile(peerfile, 'utf8');
        peer           = peer.replaceAll('${peerid}', rnd());
        await pfs.writeFile(peerfile, peer);
    }


    async packageConfig(containerlocation) {
        const packagename = path.basename(containerlocation);
        const packagefile = path.resolve(containerlocation, 'package.json');
        const packagejson = JSON.parse(await pfs.readFile(packagefile));
        packagejson.name = packagename;
        await pfs.writeFile(packagefile, JSON.stringify(packagejson, undefined, 2));
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
    }
}
