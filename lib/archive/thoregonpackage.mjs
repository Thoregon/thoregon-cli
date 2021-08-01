/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import { forEach }             from '/evolux.util';

import fs, { promises as pfs } from '/fs';
import path                    from '/path';
import process                 from '/process';
import minimatch               from '/minimatch';
import archiver                from '/archiver';

import ComponentPacker         from "./componentpacker.mjs";
import { isFile, isDirectory } from "../common.mjs";

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
    'evolux.modules/evolux.matter',
    'evolux.modules/evolux.pubsub',
    'evolux.modules/evolux.schema',
//  'evolux.modules/evolux.stellar',
    'evolux.modules/evolux.supervise',
//  'evolux.modules/evolux.touchstone',
//  'evolux.modules/evolux.turnup',
    'evolux.modules/evolux.universe',
    'evolux.modules/evolux.util',
    'thoregon.modules/thoregon.archetim',
    'thoregon.modules/thoregon.crystalline',
    'thoregon.modules/thoregon.collaboration',
    'thoregon.modules/thoregon.identity',
    'thoregon.modules/thoregon.tru4D',
    'thoregon.modules/thoregon.truCloud',
    'terra.modules/terra.gun',
    'terra.modules/terra.ipfs',
];

const browser = [
    'evolux.modules/evolux.ui',
    'thoregon.modules/thoregon.aurora',
    'thoregon.modules/thoregon.widget',
]

const node = [
    'evolux.modules/evolux.web',
]

export default class ThoregonPackage extends ComponentPacker {

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

}
