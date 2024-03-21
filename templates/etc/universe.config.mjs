/**
 *
 *
 * @author: blukassen
 */

import os          from "/os";
import { version } from "/process";
import CheckMail   from "/evolux.web/lib/mail/checkmail.mjs";
import SSI         from "./identity.mjs";

export { default as KNOWN_PEERS } from './knownpeers.mjs';
export { default as PEERID }      from "./peer.mjs";
export const IDENTITY = SSI;

//
// JS engine independence
//
import npath    from "/path";

export const path = npath;

import pfs from 'fs/promises';
export const fs = pfs;

import * as pspecials from "/evolux.util/lib/specialnode.mjs";
export const specials = pspecials;

export const NEULAND_STORAGE_OPT      = { location: 'data', name: 'neuland' };    // can override: writeCount, writeInterval
export const NEULANDLOCAL_STORAGE_OPT = { location: 'data', name: 'neulandlocal' };    // can override: writeCount, writeInterval

//
// define agent
//

let host = '${agentname}' || os.hostname();
let i = host.lastIndexOf('.');
if (host.lastIndexOf('.') > -1) {
    host = host.substring(0,i);
}
const AGENT_NAME = 'Agent ' + host + ' on ' + os.type();

export const deviceInfo = {
    name     : AGENT_NAME,
    browser  : 'none',
    vm       : {
        name: 'node',
        os  : os.type(),
        version
    },
    mobile   : false,
    pointlock: false,
    agent    : true
}

Object.defineProperties(thoregon, {
    'deviceInfo'       : { value: deviceInfo, configurable: false, enumerable: true, writable: false },
});

// email

export const checkmail = new CheckMail();

//
// Identity
//

export const GET_SECRET_WORKER = async () => {
    return (await import('/thoregon.identity/sasecretworker.mjs')).default;
}

export const PEERSIGNALING = "peer.thoregon.io";

//
// HTTP interface, access only via reverse proxy
//

export const WWW = {
    // root: 'www/',        --> default
    // common: './',        --> default
    // index: 'index.mjs',  --> default
    static: './www',
    port: 7778,
    host: "0.0.0.0",
    // cachecontrol: 'public, max-age=120'     // fresh in seconds = 2 minutes
}

//
// initialize unviverse wide services an functions
//

universe.atDawn(async (universe) => {
    await import('../thoregonsystem.mjs');

    universe.lifecycle.triggerPrepare();
    universe.lifecycle.triggerStart();
});

universe.atDusk(async (universe, code) => {
    universe.lifecycle?.triggerExit(code);
});
