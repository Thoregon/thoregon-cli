import fs       from "fs/promises";
import path     from "path";
import process  from "process";
// import crypto   from "crypto";
import { exec } from "child_process";
// import fetch    from "../util/fetch.mjs";

// import ZipLib      from "../zip/ziplib.mjs";
// import SEA         from "../crypto/sea.mjs";
// import { tmppath } from "./locations.mjs";

import { ensureDir, getDirectories, isFile } from "./fsutils.mjs";
// import genesis     from "../../genesis.mjs";

//
// constants
//

const SEP    = '/'; // path.sep;       // directory separator as separate constant
const REPSEP = '\\';
const NPM = process.env.NPM ?? 'npm';

const NPM_INSTALL = false;

//
// loader utils
//

export const insertVersion = (location, version) => {
    location = location.replaceAll(REPSEP, SEP);
    const parts = location.split(SEP);
    const module = parts.shift();
    const ref = [module, version, ...parts];
    return ref.join(SEP);
}

//
// informational functions
//

export const getCacheDate = async (root) => {
    try { return (await fs.stat(path.join(root, '.cache'))).mtime } catch (ignore) {}
}

export const getArchiveMeta = async (root) => {
    try {
        const data = await fs.readFile(path.join(root, '/etc/archive.json'));
        const meta = JSON.parse(data);
        return meta;
    } catch (ignore) {}
}

//
// fetch & verify package
//

// todo [OPEN]: enable other sorage systems (IFPS, BitTorrent, ...)
//  --> include resourceResolvers from loaders
/*
const fetchArchive = async (location) => {
    const res = await fetch(location);
    if (!res.ok) return;
    return res;
}

export const fetchArchiveDate = async (location) => {
    const res = await fetch(location, { method: 'HEAD' });
    if (!res.ok) return;
    const lastmodified = res.headers.get('last-modified');
    const archivets    = new Date(lastmodified);
    return archivets;
}

export const checkCacheUpdate = async (root, archivelocation) => {
    const archivets = await fetchArchiveDate(archivelocation);
    if (!archivets) return false;

    const cachelastmodified = await getCacheDate(root);
    const updateCache       = cachelastmodified ? cachelastmodified.getTime() !== archivets.getTime() : true;

    return updateCache;
}

export const pullArchive = async (archivelocation, spub) => {
    const res = await fetchArchive(archivelocation);
    if (!res.ok) return { err: 'archive not found' };

    const tmpdir       = SEA.rndstr(9);
    const root         = path.resolve(tmppath, tmpdir)
    const lastmodified = res.headers.get('last-modified');
    const archivets    = new Date(lastmodified);
    const buffer       = res.body;

    if (!buffer) return { err: 'archive not found'};

    const ZIP = new ZipLib();
    const entries  =  await ZIP.getZipEntries(buffer);

    let all    = '';

    for await (const entry of entries) {
        const data       = await ZIP.getEntryData(entry);
        const filename   = entry.filename;
        const dir        = path.join(tmppath, tmpdir, path.dirname(filename));
        ensureDir(dir);
        const filepath   = path.join(root, filename);
        const filehandle = await fs.open(filepath, 'w');
        await filehandle.write(data.buffer);
        await filehandle.sync();
        await filehandle.close();

        // skip etc directory for checksum
        if (!filename.startsWith('etc/')) all += data.buffer.toString('utf8');
    }

    const meta = await getArchiveMeta(root);

    if (!meta) return { err: "can't verify archive, no meta data available"};

    const salt = meta.digest.salt;
    const signature = meta.signature;
    // const identityname = meta.identity ?? 'THOREGON';
    // const spub = genesis.identities[identityname]?.pubkeys.spub;

    const hash = await SEA.hash(all, salt);
    const archiveHash = await SEA.verify(signature, spub);

    const hashEqual = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(archiveHash));

    return { tmplocation: root, valid: hashEqual, dttm: archivets, meta }
}
*/

export const removeTmpArchive = async (tmplocation) => {
    await fs.rm(tmplocation);
}

const cmd = (cmd, cwd) => {
    return new Promise((resolve, reject) => {
        let exitcode;
        const proc = exec(cmd, {
            cwd        : cwd ?? process.cwd(),
            shell      : '/bin/bash',
            windowsHide: true,
        }, (err, stdout, stderr) => {
            resolve({ ok: exitcode === 0, error: err?.stack, result: err ? stderr : stdout });
        })

        proc.on('exit', (code) => {
            exitcode = code;
            console.log('Exit', code);
        });
    })
}

export const npmInstall = async (location) => {
    if (!NPM_INSTALL) return ;
    const { ok, error, result } = await cmd(`${NPM} install --production`, location);
    if (error) console.error('npm install', result, error);
    return ok;
}

export const installModuleDependencies = async (location) => {
    if (isFile(path.join(location, 'package.json'))) await npmInstall(location);
}

export const installDependencies = async (location) => {
    if (isFile(path.join(location, 'package.json'))) await npmInstall(location);

    const dirs = await getDirectories(path.join(location, 'modules'));
    for await (const dir of dirs) {
        const dirlocation = path.join(location, 'modules', dir);
        if (isFile(path.join(dirlocation, 'package.json'))) await npmInstall(dirlocation);
    }
}

/**
 * install a verified archive to the cache
 * @param tmplocation       tmp location from inflated archive
 * @param location          target location for the archive in the cache
 * @param dttm              timestamp from the pulled archive
 * @param version           version of the archive
 * @returns {Promise<void>}
 */
export const installArchive = async (tmplocation, location, dttm, version, isLatest = false) => {
    version = version ?? '1.0.0';   // SEMVER -> https://semver.org/
    const vlocation = path.join(location, version);
    const llocation = path.join(location, '@latest');

    // cleanup & restore if there was a (partly) installation of this version
    try { await fs.rm(vlocation, { force: true, recursive: true }); } catch (ignore) {}
    ensureDir(vlocation);
    // copy the pulled version to its target location
    await fs.cp(tmplocation, vlocation, { force: true, recursive: true, preserveTimestamps: true });
    // remove the tmp download directory
    try { await fs.rm(tmplocation, { force: true, recursive: true }); } catch (ignore) {}

    if (isLatest) {
        // remove an eventually existing symlink
        try { await fs.unlink(llocation); } catch (ignore) {}       // is not be available at first attempt
        // create the @latest symlink for this version
        await fs.symlink(vlocation, llocation, 'dir');
    }

    const fh = await fs.open(path.join(vlocation, '.cache'), 'w');
    await fh.utimes(dttm, dttm);

    await installDependencies(vlocation);
}
