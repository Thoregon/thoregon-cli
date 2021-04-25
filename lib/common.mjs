/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import fs, { promises as pfs } from '/fs';
// import path                    from '/path';

export const fsstat = async (path) => { try { return await pfs.stat(path) } catch (e) {} };
export const isDirectory = async (path) => {
    let stat = await fsstat(path);
    return stat ? stat.isDirectory() : false
};
export const isFile = async (path) => {
    let stat = await fsstat(path);
    return stat ? stat.isFile() : false
};
