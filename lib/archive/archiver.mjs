/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import path                         from '/path';
import { createGzip, createGunzip } from '/zlib';

export default class Archiver {

    constructor({ writableStream } = {}) {
        this.writableStream = writableStream;
        this.chunks         = [];
        this.gzip           = createGzip({ level: 9 });
        // Write stream to archive
        this.gzip.pipe(this.writableStream);
    }

    static onTarget(writableStream) {
        const archiver = new this({ writableStream });
        return archiver;
    }

    async append(filepath, fileContent){
        const gzip       = this.gzip;
        const mimeType   = getMimeType(filepath); // Assume getMimeType is a function to determine the MIME type
        const fileHeader = Buffer.alloc(4 + Buffer.byteLength(filepath) + 4 + Buffer.byteLength(mimeType) + 4);

        fileHeader.writeUInt32BE(Buffer.byteLength(filepath), 0); // Filename length
        fileHeader.write(filepath, 4); // Filename
        fileHeader.writeUInt32BE(Buffer.byteLength(mimeType), 4 + Buffer.byteLength(filepath)); // MIME type length
        fileHeader.write(mimeType, 4 + Buffer.byteLength(filepath) + 4); // MIME type
        fileHeader.writeUInt32BE(fileContent.length, 4 + Buffer.byteLength(filepath) + 4 + Buffer.byteLength(mimeType)); // File length

        // Write file header and content to the gzip stream
        gzip.write(fileHeader);
        gzip.write(fileContent);
    }

    /*async*/ finalize() {
        return new Promise(async (resolve, reject) => {
            try {
                this.writableStream.on('close', resolve);
                this.gzip.end(); // Finalize the archive
            } catch (e) {
                reject(e);
            }
        });
    }

}


function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
        '.txt': 'text/plain',
        '.jst': 'text/plain',
        '.gif': 'image/gif',
        '.css'  : 'text/css',
        '.mjs'  : 'application/javascript',
        '.js'   : 'application/javascript',
        '.json' : 'application/json',
        '.png'  : 'image/png',
        '.jpg'  : 'image/jpeg',
        '.jpeg' : 'image/jpeg',
        '.html' : 'text/html',
        '.htm'  : 'text/html',
        '.svg'  : 'image/svg+xml',
        '.woff' : 'application/font-woff',
        '.woff2': 'font/woff2',
        '.tty'  : 'font/truetype',
        '.otf'  : 'font/opentype',
        '.wasm' : 'application/wasm',
        '.eot'  : 'application/vnd.ms-fontobject',
        // Add more MIME types as needed
    };

    return mimeTypes[ext] || 'application/octet-stream';
}