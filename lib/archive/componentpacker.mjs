/**
 * creates a deployable component package
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import fs, { promises as pfs } from '/fs';
import path                    from '/path';
import process                 from '/process';
import minimatch               from '/minimatch';
import archiver                from '/archiver';
import Archiver                from "./archiver.mjs";
import { forEach }             from '/evolux.util';
import { Readable }            from 'stream';

import SEA                     from '/evolux.everblack/lib/crypto/sea.mjs'

import { isFile, isDirectory } from "../common.mjs";

import {
    ErrNotInstalled,
    ErrNotADirectory,
    ErrOptionMissing,
    ErrSIDRequestExists   }   from "../errors.mjs";
import RepositorySource       from "/thoregon.archetim/lib/repository/repositorysource.mjs";
import RepositoryEntry        from "/thoregon.archetim/lib/repository/repositoryentry.mjs";
import Publisher              from "/thoregon.archetim/lib/repository/publisher.mjs";
import RepositoryEntryVersion from "/thoregon.archetim/lib/repository/repositoryentryversion.mjs";

const excludes = [
    '*.md',
    '*.zip',
    '*.txt',
    '.git*',
    // 'package.json',
    // 'package-lock.json',
    // 'LICENSE',           // keep the licence
    'node_modules',
    '.DS_Store',
    '**/libold/**',         // old versions which should not be removed now
    '**/libnext/**',        // future code which should not be added to package
    '**/doc/**',
    '**/test/**',
    '**/tests/**',
];

const exceptions = ['**/nodepeer/node_modules'];

const testexcludes = [
    '*.md',
    '*.zip',
    '*.txt',
    '.git*',
    // 'package.json',
    // 'package-lock.json',
    // 'LICENSE',           // keep the licence
    'node_modules',
    '.DS_Store',
    '**/libold/**',         // old versions which should not be removed now
    '**/libnext/**',        // future code which should not be added to package
    '**/doc/**',
];

export default class ComponentPacker {

    target(dir, archive) {
        if (!dir) throw ErrNotADirectory('<none>');
        if (dir.startsWith('.')) dir = path.join(process.cwd(), dir);
        if (!archive) {
            let name    = path.basename(dir);
            archive = name; // `${name}.zip`; //`${target}/${name}.zip`;
        }
        return { location: dir, archive };
    }

    /**
     * if name is omitted, the direcory name (basename, last part of path) is used
     * as name
     * @param {String} dir  path to a directory containing the component. can be relative or absolute
     * @param {String} [name]   if omitted, the directory name (basename, last part of path) is used
     * @param {String} [target] if omitted, the package will built in the parent from dir as 'name.neuarch.gz'
     */
    async build(dir, packname, { kind, multi = false, identity, neuland, output, skip, ui=true, assets=true, path, test } = {}) {
        if (!identity) throw ErrOptionMissing('-i <identity>');
        if (!dir) throw ErrNotADirectory('<none>');
        if (!await isDirectory(dir)) throw ErrNotADirectory(dir);
        let { location, archive } = this.target(dir, packname);
        if (!ui) {
            excludes.push('**/ui/**');
            excludes.push('**/routes.mjs');
        }
        if (!assets) excludes.push('**/assets/**');

        let found = [];
        const components = await this.explore(location, '', found, { kind, multi, skip, test });
        console.log('Found files:', found.length);
        const packagefile = output ?? packname ?? path.basename(dir);
        const reposource = await this.buildRepoSource(components, packname);
        const archiveprops = await this.makeArchive(packagefile, { files: found, components, identityfile: identity, multi, distlocation: 'dist/packages', cpath: path, reposource });
        return { archive, ...archiveprops };
    }

    async buildRepoSource(modules, packname, opt) {
        const repoSource = new RepositorySource('NEULAND');
        const repoEntry  = new RepositoryEntry(packname);
        // todo: publisher as params
        const publisher  = new Publisher('upayme.plus', { name: 'uPayMe Main Repo', uri: 'https://upayme.plus' });
        const repoVersion = new RepositoryEntryVersion('1.0.0', { modules/*, digest: opt.digest*/ });
        repoEntry.setVersion('1.0.0', repoVersion);
        repoEntry.publisher = publisher;
        repoSource.setEntry(repoEntry.name, repoEntry);

        const source = repoSource.asSource(4);
        //  console.log("\nRepo: \n", source, "\n********\n\n");
        return source;
    }
    async merge(packname, packages) {
        // read all packages into files array
        // check if identity is the same -> throw
        // create a new archive with signed hash
    }


    async explore(dir, modulelocation, found, { kind, multi, skip = [], test = false, excludes = [] } = {}) {
        if (!(await isDirectory(dir))) return;
        const modulename = path.basename(dir);
        if (skip.includes(modulename)) return;
        let entries = await pfs.readdir(dir);
        let components = [];
        if (!multi) components.push(modulename);    // only one component
        await forEach(entries, async (entry) => {
            const entrypath = path.join(dir, entry);
            if (this.include(entrypath, test, excludes)) {
                if (await isDirectory(entrypath)) {
                    if (multi) components.push(entry);
                    // explore subdirectories
                    await this.explore(entrypath, path.join(modulelocation, entry), found, { kind, multi: false, skip, excludes });     // no 'multi' in recursive exploring
                } else {
                    if (kind === 'browser' && entry === 'index.reliant.mjs') {
                        let indexentry = found.find(({ fslocation }) => fslocation === path.join(dir, 'index.mjs'));
                        if (indexentry) {
                            indexentry.fslocation = path.join(dir, 'index.reliant.mjs');
                        } else {
                            found.push({ fslocation: entrypath, modulelocation: path.join(modulelocation, entry) });
                        }
                    } else {
                        found.push({ fslocation: entrypath, modulelocation: path.join(modulelocation, entry) });
                    }
                }
            }
        });

        return components;
    }

    include(modulepath, test = false, excl = []) {
        if (exceptions.find((pattern) => minimatch(modulepath, pattern, { matchBase: true }))) return true;
        excl = [ ...(test ? testexcludes : excludes), ...excl ];
        return !(path.basename(modulepath).startsWith('.')) && !excl.find((pattern) => minimatch(modulepath, pattern, { matchBase: true }));
    }

    async makeArchive(tharfile, { files, components, identityfile, multi, distlocation = '', cpath, reposource } = {}) {
        if (!identityfile.startsWith('.') || !identityfile.startsWith('/')) identityfile = `./${identityfile}`;
        const identity = (await import(identityfile)).default;

        if (!tharfile.endsWith(".neuarch.gz")) tharfile += ".neuarch.gz";

        const archiveprops = {
            identiy: {
                alias: identity.alias,
                salt : identity.salt
            }
        };

        const tharlocation = path.resolve(process.cwd(), distlocation, tharfile);
        const output = fs.createWriteStream(tharlocation);

        let archive = Archiver.onTarget(output);
        const meta = { components, repo: (new Function("return { " + reposource + "}"))() };
        const salt = SEA.rndstr(9);
        let all    = '';

        // now package all found files
        files.forEach(({ fslocation, modulelocation }) => {
            const name = multi ? modulelocation : path.join('/', cpath ?? components[0], modulelocation);
            archive.append(name, fs.readFileSync(fslocation));
            all += fs.readFileSync(fslocation, { encoding:'utf8', flag:'r' });
        });

        const hash = await SEA.hash(all, salt);
        // todo: send to Vault/HardwareToken for signature
        const sign = await SEA.sign(hash, identity.pairs);

        meta.digest = {
            algo  : 'SHA-256',
            hash,
            salt
        };
        meta.identity = identity.alias;
        meta.signature = sign;

        // meta.reposource.digets = meta.digest;

        // add metainfo
        archive.append('/etc/archive.json', Buffer.from(JSON.stringify(meta, null, 4)));

        // now finalize the archive
        archive.finalize();

        return { ...archiveprops, ...meta };

    }

    async _makeArchive(tharfile, { files, components, identityfile, multi, distlocation = '', cpath, reposource } = {}) {
        if (!identityfile.startsWith('.') || !identityfile.startsWith('/')) identityfile = `./${identityfile}`;
        const identity = (await import(identityfile)).default;

        if (!tharfile.endsWith(".zip")) tharfile += ".zip";

        const archiveprops = {
            identiy: {
                alias: identity.alias,
                salt : identity.salt
            }
        };

        let archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        const tharlocation = path.resolve(process.cwd(), distlocation, tharfile);
        const output = fs.createWriteStream(tharlocation);

        // listen for all archive data to be written
        // 'close' event is fired only when a file descriptor is involved
        output.on('close', function() {
            console.log(archive.pointer() + ' total bytes');
            // console.log('archiver has been finalized and the output file descriptor has closed.');
        });

        // This event is fired when the data source is drained no matter what was the data source.
        // It is not part of this library but rather from the NodeJS Stream API.
        // @see: https://nodejs.org/api/stream.html#stream_event_end
        output.on('end', function() {
            // console.log('Data has been drained');
        });

        // catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', function(err) {
            if (err.code === 'ENOENT') {
                // log warning
            } else {
                // throw error
                throw err;
            }
        });

        // catch error explicitly
        archive.on('error', function(err) {
            throw err;
        });

        archive.pipe(output);

        // create meta informaiton about the archive
        const meta = { components, repo: (new Function("return { " + reposource + "}"))() };
        const salt = SEA.rndstr(9);
        let all    = '';

        // now package all found files
        files.forEach(({ fslocation, modulelocation }) => {
            const name = multi ? modulelocation : path.join('/', cpath ?? components[0], modulelocation);
            archive.append(fs.createReadStream(fslocation), { name });
            all += fs.readFileSync(fslocation, { encoding:'utf8', flag:'r' });
        });

        const hash = await SEA.hash(all, salt);
        // todo: send to Vault/HardwareToken for signature
        const sign = await SEA.sign(hash, identity.pairs);

        meta.digest = {
            algo  : 'SHA-256',
            hash,
            salt
        };
        meta.identity = identity.alias;
        meta.signature = sign;

        // meta.reposource.digets = meta.digest;

        // add metainfo
        archive.append(Readable.from(JSON.stringify(meta, null, 4)), { name: '/etc/archive.json'});

        // now finalize the archive
        archive.finalize();

        return { ...archiveprops, ...meta };
    }
}
