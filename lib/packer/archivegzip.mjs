/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */
// Import necessary modules
import fs                           from '/fs';
import path                         from '/path';
import { createGzip, createGunzip } from '/zlib';
import minimatch                    from '/minimatch';


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

const excludes = [
    '*.md',
    '*.zip',
    '*.txt',
    '*.ts',
    '.git*',
    '.git/**',
    // 'package.json',
    // 'package-lock.json',
    // 'LICENSE',           // keep the licence
    'node_modules',
    '.DS_Store',
    '**/libold/**',         // old versions which should not be removed now
    '**/libnext/**',        // future code which should not be added to package
    '**/doc/**',
    '**/test/**',
    '**/tests/**',
];

const exceptions = ['**/nodepeer/node_modules'];

const testexcludes = [
    '*.md',
    '*.zip',
    '*.txt',
    '.git*',
    // 'package.json',
    // 'package-lock.json',
    // 'LICENSE',           // keep the licence
    'node_modules',
    '.DS_Store',
    '**/libold/**',         // old versions which should not be removed now
    '**/libnext/**',        // future code which should not be added to package
    '**/doc/**',
];

// Function to get all files in a directory (including subdirectories)
export function getAllFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            // Recursively add files from subdirectories
            results = results.concat(getAllFiles(filePath));
        } else {
            results.push(filePath);
        }
    });
    return results;
}

function include(modulepath, test = false, excl = []) {
    if (exceptions.find((pattern) => minimatch(modulepath, pattern, { matchBase: true }))) return true;
    excl = [ ...(test ? testexcludes : excludes), ...excl ];
    return !(path.basename(modulepath).startsWith('.')) && !excl.find((pattern) => minimatch(modulepath, pattern, { matchBase: true }));
}


// Function to create an archive and compress files using gzip
export async function createArchive(dir, outputArchive) {
    return new Promise(async (resolve, reject) => {
        try {
            const files       = getAllFiles(dir);
            const writeStream = fs.createWriteStream(outputArchive);
            const gzip        = createGzip({ level: 9 });
            const relpos      = dir.lastIndexOf('/') + 1;

                writeStream.on('close', resolve);

            // Write stream to archive
            gzip.pipe(writeStream);

            files.forEach((file) => {
                const inDirPath = file.substring(dir.length + 1);
                if (path.basename(inDirPath).startsWith('.')) return;    // log skipped
                if (!include(inDirPath)) return;    // log skipped
                const relativePath = file.substring(relpos);
                const fileContent  = fs.readFileSync(file);
                const mimeType = getMimeType(relativePath); // Assume getMimeType is a function to determine the MIME type
                const fileHeader = Buffer.alloc(4 + Buffer.byteLength(relativePath) + 4 + Buffer.byteLength(mimeType) + 4);

                fileHeader.writeUInt32BE(Buffer.byteLength(relativePath), 0); // Filename length
                fileHeader.write(relativePath, 4); // Filename
                fileHeader.writeUInt32BE(Buffer.byteLength(mimeType), 4 + Buffer.byteLength(relativePath)); // MIME type length
                fileHeader.write(mimeType, 4 + Buffer.byteLength(relativePath) + 4); // MIME type
                fileHeader.writeUInt32BE(fileContent.length, 4 + Buffer.byteLength(relativePath) + 4 + Buffer.byteLength(mimeType)); // File length

                // Write file header and content to the gzip stream
                gzip.write(fileHeader);
                gzip.write(fileContent);
            });

            gzip.end(); // Finalize the archive
        } catch (e) {
            reject(e);
        }
    });
}

// Function to unpack the archive and extract files
export function unpackArchive(inputArchive, outputDir) {
    return new Promise(async (resolve, reject) => {
        try {
            const readStream = fs.createReadStream(inputArchive);
            const gunzip     = createGunzip();

            readStream.pipe(gunzip);

            let remaining = Buffer.alloc(0);

            gunzip.on('data', (chunk) => {
                remaining = Buffer.concat([remaining, chunk]);

                while (remaining.length > 0) {
                    if (remaining.length < 4) break;

                    const nameLength = remaining.readUInt32BE(0);

                    if (remaining.length < 4 + nameLength + 4) break;

                    const filename = remaining.slice(4, 4 + nameLength).toString('utf8');
                    const mimeLength = remaining.readUInt32BE(4 + nameLength);

                    if (remaining.length < 4 + nameLength + 4 + mimeLength + 4) break;

                    const mimetype = remaining.slice(4 + nameLength + 4, 4 + nameLength + 4 + mimeLength).toString('utf8');
                    const fileLength = remaining.readUInt32BE(4 + nameLength + 4 + mimeLength);

                    if (remaining.length < 4 + nameLength + 4 + mimeLength + 4 + fileLength) break;

                    const fileContent = remaining.slice(4 + nameLength + 4 + mimeLength + 4, 4 + nameLength + 4 + mimeLength + 4 + fileLength);

                    const filePath = path.join(outputDir, filename);
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    fs.writeFileSync(filePath, fileContent);

                    remaining = remaining.slice(4 + nameLength + 4 + mimeLength + 4 + fileLength);
                }
            });

            gunzip.on('end', resolve);
        } catch (e) {
            reject(e);
        }
    })
}
