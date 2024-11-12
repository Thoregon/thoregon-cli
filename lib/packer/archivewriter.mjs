/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */
import { TextEncoder } from 'util';
import { readFilesRecursively } from './filereader.mjs';

/**
 * Write files to a WritableStream as an archive.
 * @param {Array<{path: string, content: Buffer}>} files - Array of files with paths and contents.
 * @param {WritableStream} writableStream - The stream to write the archive to.
 */
export async function writeArchive(directory, writableStream) {
    const files = await readFilesRecursively(directory);
    const relpos = directory.lastIndexOf('/') + 1;

    const chunks = [];
    for (const file of files) {
        const relativePath = file.path.substring(relpos);
        const relativePathBuffer = new TextEncoder().encode(relativePath); // Convert path to Uint8Array
        const relativePathLength = relativePathBuffer.length; // Length of the path in bytes
        const contentLength = file.content.length; // Length of the file content in bytes

        // Write the file metadata (path length, path, content length)
        const pathlen = Buffer.alloc(4);
        pathlen.writeUInt32BE(relativePathLength);
        // writer.write(pathlen);
        // writer.write(relativePathBuffer);
        const contentlen = Buffer.alloc(4);
        contentlen.writeUInt32BE(contentLength);
        // writer.write(contentlen);
        const header = new Blob([pathlen, relativePathBuffer, contentlen]);
        chunks.push(header);
        // Write the file content
        // writer.write(file.content);
        chunks.push(file.content);
    }
    const compressionStream = new Blob(chunks).stream().pipeThrough(new CompressionStream('gzip'));
    // Read all the bytes from this stream.
    // compressionStream.pipeTo(writableStream);
    for await (const chunk of compressionStream) {
        writableStream.write(chunk);
    }
    writableStream.end();
}
