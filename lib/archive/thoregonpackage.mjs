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
import minimatch               from '/minimatch';
import archiver                from '/archiver';
import { forEach }             from '/evolux.util';

const thoregonRoot = async () => (process.env.THOREGON_ROOT ? process.env.THOREGON_ROOT : await isFile('./.thoregonroot')) ? path.join(process.cwd(), (await pfs.readFile('./.thoregonroot')).toString().trim()) : process.cwd();

const excludes = [
    '*.md',
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

const modules = [
    'evolux.modules/evolux.dyncomponents',
//  'evolux.modules/evolux.equipment',
    'evolux.modules/evolux.everblack',
    'evolux.modules/evolux.lucent',
    'evolux.modules/evolux.matter',
    'evolux.modules/evolux.pubsub',
    'evolux.modules/evolux.schema',
//  'evolux.modules/evolux.stellar',
    'evolux.modules/evolux.supervise',
//  'evolux.modules/evolux.touchstone',
//  'evolux.modules/evolux.turnup',
    'evolux.modules/evolux.universe',
    'evolux.modules/evolux.util',
    'thoregon.modules/thoregon.collaboration',
    'thoregon.modules/thoregon.identity',
    'thoregon.modules/thoregon.tru4D',
    'thoregon.modules/thoregon.truCloud',
    'terra.modules/terra.gun',
//  'terra.modules/terra.ipfs',
];

const browser = [
    'evolux.modules/evolux.ui',
    'thoregon.modules/thoregon.aurora',
    'thoregon.modules/thoregon.widget',
]

const node = [
    'evolux.modules/evolux.web',
]

let fsstat = async (path) => { try { return await pfs.stat(path) } catch (e) {} };
const isDirectory = async (path) => {
    let stat = await fsstat(path);
    return stat ? stat.isDirectory() : false
};
const isFile = async (path) => {
    let stat = await fsstat(path);
    return stat ? stat.isFile() : false
};


export default class ThoregonPackage {

    async package(kind, tharfile) {
        let varmodules = (kind === 'browser') ? browser : kind === 'node' ? node : [];
        let packagmodules = [...modules, ...varmodules];
        let found = [];
        let root = await thoregonRoot();
        await forEach(packagmodules, async (modulename) => {
            let modulelocation = modulename.substr(modulename.indexOf('/'));
            await this.explore(path.join(root, modulename), modulelocation, found, kind);
        });

        console.log('Found files:', found.length);
        // found.forEach(entry => console.log('Entry', entry));
        this.makeArchive(tharfile, found);
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
