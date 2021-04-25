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

import { isFile, isDirectory } from "../common.mjs";
import { ErrNotADirectory }    from "../errors.mjs";

const excludes = [
    '*.md',
    '*.zip',
    '*.txt',
    '.git*',
    'package.json',
    'package-lock.json',
    'LICENSE',
    'node_modules',
    '.DS_Store',
    '**/libold/**',
    '**/doc/**',
    '**/test/**',
    '**/tests/**',
];

export default class ComponentPacker {

    target(dir, packagefile) {
        if (!dir) throw ErrNotADirectory('<none>');
        if (dir.startsWith('.')) dir = path.join(process.cwd(), dir);
        if (!packagefile) {
            let name    = path.basename(dir);
            packagefile = `${name}.zip`; //`${target}/${name}.zip`;
        }
        return { location: dir, packagefile };
    }

    /**
     * if name is omitted, the direcory name (basename, last part of path) is used
     * as name
     * @param {String} dir  path to a directory containing the component. can be relative or absolute
     * @param {String} [name]   if omitted, the directory name (basename, last part of path) is used
     * @param {String} [target] if omitted, the package will built in the parent from dir as 'name.zip'
     */
    async build(dir, packname) {
        if (!dir) throw ErrNotADirectory('<none>');
        if (!await isDirectory(dir)) throw ErrNotADirectory(dir);
        let { location, packagefile } = this.target(dir, packname);
        let found = [];
        await this.explore(location, '', found, '');
        console.log('Found files:', found.length);
        this.makeArchive(packagefile, found);
        return packagefile;
    }

    async explore(dir, modulelocation, found, kind) {
        if (!(await isDirectory(dir))) return;
        let entries = await pfs.readdir(dir);
        await forEach(entries, async (entry) => {
            const entrypath = path.join(dir, entry);
            if (this.include(entrypath)) {
                if (await isDirectory(entrypath)) {
                    // explore subdirectories
                    await this.explore(entrypath, path.join(modulelocation, entry), found);
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
    }

    include(modulepath) {
        return !(path.basename(modulepath).startsWith('.')) && !excludes.find((pattern) => minimatch(modulepath, pattern, { matchBase: true }));
    }

    makeArchive(tharfile, files) {
        let archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        let tharlocation = path.join(process.cwd(), tharfile);
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

        // now package all found files
        files.forEach(({ fslocation, modulelocation }) => {
            archive.append(fs.createReadStream(fslocation), { name: modulelocation });
        });

        // now finalize the archive
        archive.finalize();
    }
}
