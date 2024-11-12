/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */
import { createWriteStream } from 'fs';
import path, { dirname } from 'path';
import { mkdir, open }   from 'fs/promises';
import { createGunzip }  from 'zlib';

export default class UnArchiver {

    constructor(targetDir) {
        this.targetDir = targetDir ?? process.cwd();
    }

    async unpackArchive(archivePath, tartgetDir) {
        tartgetDir           = path.resolve(tartgetDir ?? this.targetDir);
        const fd             = await open(path.resolve(archivePath));
        const readableStream = fd.createReadStream();
        await this._unpackArchive(readableStream, tartgetDir);
    }

    /**
     *
     */


    /**
     * Unpack a compressed archive from a ReadableStream.
     * @param {Readable} readableStream - The Node.js Readable stream to read the compressed archive from.
     */
    async _unpackArchive(readableStream,  tartgetDir) {
        // Convert the Node.js Readable stream to a Web Stream
        // const webReadableStream = nodeReadableToWeb(readableStream);

        // Create a DecompressionStream for gzip decompression
        // const decompressionStream = new DecompressionStream('gzip');
        // Pipe the Web Readable stream through the decompression stream
        //const decompressedStream = webReadableStream.pipeThrough(decompressionStream);

        // Create a gunzip decompression stream
        const gunzip = createGunzip();

        // Pipe the readable stream through the gunzip decompression stream
        const decompressedStream = readableStream.pipe(gunzip);

        let buffer = Buffer.alloc(0);

        for await (const chunk of decompressedStream) {
            buffer = Buffer.concat([buffer, Buffer.from(chunk)]);

            while (buffer.length > 8) { // At least 4 bytes for path length and 4 bytes for content length
                // Read the file path length (first 4 bytes)
                const pathLength = buffer.readUInt32BE(0);
                if (buffer.length < 4 + pathLength + 4) break;

                // Read the file path
                const relativePathBuffer = buffer.slice(4, 4 + pathLength);
                const relativePath = relativePathBuffer.toString('utf-8');

                // Read the file path length (first 4 bytes)
                const mimeLength = buffer.readUInt32BE(4 + pathLength);
                if (buffer.length < 4 + pathLength + 4 + mimeLength + 4) break;

                // Read the mimetype
                const mimetypeBuffer = buffer.slice(4 + pathLength + 4, 4 + pathLength + 4 + mimeLength);
                const mimetype = mimetypeBuffer.toString('utf-8');

                // Read the file content length
                const contentLength = buffer.readUInt32BE(4 + pathLength + 4 + mimeLength);
                if (buffer.length < 4 + pathLength + 4 + mimeLength + 4 + contentLength) break;

                // Read the file content
                const content = buffer.slice(4 + pathLength + 4 + mimeLength + 4, 4 + pathLength + 4 + mimeLength + 4 + contentLength);

                // Write the file to the disk
                await this.saveFile(path.resolve(tartgetDir, relativePath.substring(1)), content);

                // Update buffer to remove the processed part
                buffer = buffer.slice(4 + pathLength + 4 + mimeLength + 4 + contentLength);
            }
        }
    }

    /**
     * Save the unpacked file to the correct location.
     * @param {string} path - The relative path of the file.
     * @param {Buffer} content - The content of the file.
     */

    async saveFile(path, content) {
        const directory = dirname(path);
        await mkdir(directory, { recursive: true });
        const writeStream = createWriteStream(path);
        writeStream.write(content);
        writeStream.end();
    }

}
