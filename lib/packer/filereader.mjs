/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Recursively read all files in a directory.
 * @param {string} dir - The directory path to start reading.
 * @returns {Promise<Array<{path: string, content: Buffer}>>} - Array of objects containing file paths and their contents.
 */
export async function readFilesRecursively(dir) {
    let results = [];
    const list = await fs.readdir(dir, { withFileTypes: true });

    for (const file of list) {
        const filePath = join(dir, file.name);
        if (file.isDirectory()) {
            results = results.concat(await readFilesRecursively(filePath));
        } else {
            const content = await fs.readFile(filePath);
            results.push({ path: filePath, content });
        }
    }

    return results;
}
