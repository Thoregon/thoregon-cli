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

import ComponentPacker         from "./componentpacker.mjs";
import { isFile, isDirectory } from "../common.mjs";

import RepositorySource       from "/thoregon.archetim/lib/repository/repositorysource.mjs";
import RepositoryEntry        from "/thoregon.archetim/lib/repository/repositoryentry.mjs";
import Publisher              from "/thoregon.archetim/lib/repository/publisher.mjs";
import RepositoryEntryVersion from "/thoregon.archetim/lib/repository/repositoryentryversion.mjs";

const thoregonRoot = async () => (process.env.THOREGON_ROOT ? process.env.THOREGON_ROOT : await isFile('./.thoregonroot')) ? path.join(process.cwd(), (await pfs.readFile('./.thoregonroot')).toString().trim()) : process.cwd();

const nodeexcludes = [
    '**/browserpeer/**'
];

const browserexcludes = [
    '**/nodepeer/**'
]


const modules = [
    'evolux.modules/evolux.dyncomponents',
//  'evolux.modules/evolux.equipment',
    'evolux.modules/evolux.everblack',
//  'evolux.modules/evolux.matter',
    'evolux.modules/evolux.pubsub',
//  'evolux.modules/evolux.schema',
//  'evolux.modules/evolux.stellar',
    'evolux.modules/evolux.supervise',
//  'evolux.modules/evolux.touchstone',
//  'evolux.modules/evolux.turnup',
    'evolux.modules/evolux.universe',
    'evolux.modules/evolux.util',
    'thoregon.modules/thoregon.archetim',
    'thoregon.modules/thoregon.crystalline',
    'thoregon.modules/thoregon.neuland',
    'thoregon.modules/thoregon.telom',
//  'thoregon.modules/thoregon.collaboration',
    'thoregon.modules/thoregon.identity',
    'thoregon.modules/thoregon.tru4D',
    'thoregon.modules/thoregon.truCloud',
//  'terra.modules/terra.gun',
//  'terra.modules/terra.ipfs',
];

const browser = [
//  'evolux.modules/evolux.ui',
    'thoregon.modules/thoregon.aurora',
//  'thoregon.modules/thoregon.widget',
]

const node = [
    'evolux.modules/evolux.web',
]

export default class ThoregonPackage extends ComponentPacker {

    async package(tharfile, { kind = 'browser', identity } = {}) {
        let varmodules = (kind === 'browser') ? browser : kind === 'node' ? node : [];
        const excludes =  (kind === 'browser') ? browserexcludes : kind === 'node' ? nodeexcludes : [];
        let packagmodules = [...modules, ...varmodules];
        let found = [];
        let root = await thoregonRoot();
        await forEach(packagmodules, async (modulename) => {
            let modulelocation = modulename.substr(modulename.indexOf('/'));
            await this.explore(path.join(root, modulename), modulelocation, found,{ kind, multi: false, excludes });
        });

        console.log('Found files:', found.length);
        // found.forEach(entry => console.log('Entry', entry));
        const modulesnames = packagmodules.map(module => path.basename(module));
        const reposource = await this.buildRepoSource(modulesnames);
        const archiveprops = await this.makeArchive(tharfile, { files: found, components: modulesnames, identityfile: identity, multi: true, distlocation: 'dist/thoregon', reposource });
        console.log("Archive Properties\n", JSON.stringify(archiveprops, null, 4));
    }

    async buildRepoSource(modules) {
        const repoSource = new RepositorySource('THOREGON');
        const repoEntry  = new RepositoryEntry('thoregon');
        const publisher  = new Publisher('thoregon.io', { name: 'Thoregon Main Repo', uri: 'https://thoregon.io' });
        const repoVersion = new RepositoryEntryVersion('1.0.0', { modules });
        repoEntry.setVersion('1.0.0', repoVersion);
        repoEntry.publisher = publisher;
        repoSource.setEntry(repoEntry.name, repoEntry);

        const source = repoSource.asSource(4);
       //  console.log("\nRepo: \n", source, "\n********\n\n");
        return source;
    }

}
