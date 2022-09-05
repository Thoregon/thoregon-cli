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
import { forEach }             from '/evolux.util';
import { Readable }            from 'stream';

import SEA                     from '/evolux.everblack/lib/crypto/sea.mjs'

import { isFile, isDirectory } from "../common.mjs";
import { ErrNotADirectory }    from "../errors.mjs";

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

export default class ComponentPacker {

    target(dir, archive) {
        if (!dir) throw ErrNotADirectory('<none>');
        if (dir.startsWith('.')) dir = path.join(process.cwd(), dir);
        if (!archive) {
            let name    = path.basename(dir);
            archive = `${name}.zip`; //`${target}/${name}.zip`;
        }
        return { location: dir, archive };
    }

    /**
     * if name is omitted, the direcory name (basename, last part of path) is used
     * as name
     * @param {String} dir  path to a directory containing the component. can be relative or absolute
     * @param {String} [name]   if omitted, the directory name (basename, last part of path) is used
     * @param {String} [target] if omitted, the package will built in the parent from dir as 'name.zip'
     */
    async build(dir, packname, { kind, multi = false, identity } = {}) {
        if (!dir) throw ErrNotADirectory('<none>');
        if (!await isDirectory(dir)) throw ErrNotADirectory(dir);
        let { location, archive } = this.target(dir, packname);
        let found = [];
        const components = await this.explore(location, '', found, { kind, multi });
        console.log('Found files:', found.length);
        const archiveprops = await this.makeArchive(packagefile, found, components, identity);
        return { archive, ...archiveprops };
    }

    async explore(dir, modulelocation, found, { kind, multi } = {}) {
        if (!(await isDirectory(dir))) return;
        let entries = await pfs.readdir(dir);
        let components = [];
        if (!multi) components.push(path.basename(dir));    // only one component
        await forEach(entries, async (entry) => {
            const entrypath = path.join(dir, entry);
            if (this.include(entrypath)) {
                if (await isDirectory(entrypath)) {
                    if (multi) components.push(entry);
                    // explore subdirectories
                    await this.explore(entrypath, path.join(modulelocation, entry), found, { kind, multi: false });     // no 'multi' in recursive exploring
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

    include(modulepath) {
        return !(path.basename(modulepath).startsWith('.')) && !excludes.find((pattern) => minimatch(modulepath, pattern, { matchBase: true }));
    }

    async makeArchive(tharfile, files, components, identityfile) {
        const identity = (await import(identityfile)).default;

        const archiveprops = {
            identiy: {
                alias: identity.alias,
                salt : identity.salt
            }
        };

        let archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        const tharlocation = path.join(process.cwd(), tharfile);
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
        const meta = { components };
        const salt = SEA.rndstr(9);
        let all    = '';

        // now package all found files
        files.forEach(({ fslocation, modulelocation }) => {
            archive.append(fs.createReadStream(fslocation), { name: modulelocation });
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

        // add metainfo
        archive.append(Readable.from(JSON.stringify(meta, null, 4)), { name: '/etc/archive.json'});

        // now finalize the archive
        archive.finalize();

        return { ...archiveprops, ...meta };
    }
}
