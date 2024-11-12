/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */
import { createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { mkdir } from 'fs/promises';

/**
 * Unpack an archive from a ReadableStream.
 * @param {ReadableStream} readableStream - The stream to read the archive from.
 */
export async function unpackArchive(readableStream, directory) {
    // Create a DecompressionStream for gzip decompression
    const decompressionStream = new DecompressionStream('gzip');
    const decompressedStream = readableStream.pipe(decompressionStream);

    let buffer = Buffer.alloc(0);

    for await (const chunk of decompressedStream) {
        buffer = Buffer.concat([buffer, chunk]);

        while (buffer.length > 8) { // At least 4 bytes for path length and 4 bytes for content length
            // Read the file path length (first 4 bytes)
            const pathLength = buffer.readUInt32BE(0);
            if (buffer.length < 4 + pathLength + 4) break;

            // Read the file path
            const relativePathBuffer = buffer.slice(4, 4 + pathLength);
            const relativePath = relativePathBuffer.toString('utf-8');

            // Read the file content length
            const contentLength = buffer.readUInt32BE(4 + pathLength);
            if (buffer.length < 4 + pathLength + 4 + contentLength) break;

            // Read the file content
            const content = buffer.slice(4 + pathLength + 4, 4 + pathLength + 4 + contentLength);

            // Write the file to the disk
            await saveFile(join(directory, relativePath), content);

            // Update buffer to remove the processed part
            buffer = buffer.slice(4 + pathLength + 4 + contentLength);
        }
    }
}

/**
 * Save the unpacked file to the correct location.
 * @param {string} path - The relative path of the file.
 * @param {Buffer} content - The content of the file.
 */
async function saveFile(path, content) {
    const directory = dirname(path);
    await mkdir(directory, { recursive: true });
    const writeStream = createWriteStream(path);
    writeStream.write(content);
    writeStream.end();
}
