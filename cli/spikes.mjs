/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import { createArchive, unpackArchive } from "../lib/packer/archivegzip.mjs";

const sourcedir = '/Users/bernhardlukassen/Documents/dev/Projects/ThoregonUniverse/thoregon.modules/thoregon.aurora';
const archive = './dist/test/test.arch.gz';
const tgtdir = './dist/test/unpack';

// Usage
try {
    const start = Date.now();
    await createArchive(sourcedir, archive);
    const create = Date.now();
    console.log('> Archive created', create - start);
    await unpackArchive(archive, tgtdir);
    const extract = Date.now();
    console.log('> Archive extracted', extract - create);
} catch (e) {
    console.error(e);
}
