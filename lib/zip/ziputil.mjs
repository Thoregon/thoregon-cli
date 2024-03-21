/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import fs, { promises as pfs } from '/fs';
import path                    from '/path';
import { ensureDir }           from "../fsutils.mjs";
import zip                     from "./zip.js";
import Inflate                 from './inflate.js';
import ArrayBufferReader       from "./ArrayBufferReader.js";
zip.useWebWorkers = false;  // don't use separate workers, this is a worker

class ZipUtil {

    async extractZIP(ziplocation, extractlocation) {
        const content      = await pfs.readFile(ziplocation);
        const entries      = await this.getZipEntries(content);
        for await (const entry of entries) {
            const entryname = path.resolve(extractlocation, entry.filename);
            await ensureDir(path.dirname(path.join(extractlocation, entry.filename)));
            const data      = new DataView(await (await this.getEntryData(entry)).arrayBuffer());
            await pfs.writeFile(entryname, data);
        }
        // console.log("ZIP");
    }

    async extractFileContent(ziplocation, filepath) {
        const content   = await pfs.readFile(ziplocation);
        const entries   = await this.getZipEntries(content);
        const fileentry = entries.find((entry) => entry.filename === filepath);
        if (!fileentry) return;
        const fdata     = await this.getEntryData(fileentry);
        // const buffer    = await (fdata).arrayBuffer();
        const data      = await fdata.text(); // String.fromCharCode(buffer);     // utf-8 ?
        return data;
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

export default new ZipUtil();
