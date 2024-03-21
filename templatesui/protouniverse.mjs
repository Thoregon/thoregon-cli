/**
 * Thoregon micro kernel
 *
 * setup the thoregon environment for browser based runtime
 *
 * Works as a bootloader, loads basic components.
 * - ipfs
 * From ipfs:
 * - gun
 * - evolux.universe
 * - evolux.dyncomponents
 *
 * todo:
 *  - cleanup
 *  - refactor
 *  - order
 *  - document
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

//
// repository entiries for boot
//

// import genesis from "./genesis.mjs";
// import repos   from "./repos.mjs";

//
// helpers
//

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// just push back to the event loop and perform following steps 'async' (simulated)
const doAsync = () => timeout(0);

let registration;

/*
    clientparams: recognise kind of peer/client
    - nature: sovereign (standalone peer, providing services)
        - density: headless
        - density: headed
    - nature: reliant (from an individual, typically in a browser)
        - density: lite
        - density: rich

   yes, this can be faked by the peer but it does not matter because the peers can decide themselves what they are
   it is not of interest for the loader
 */
// const url = new URL(document.location.href);
// const devparam = url.searchParams.get('isDev');
let   isDev = false; // devparam ? devparam === 'true' || devparam === '1' : window.location.hostname === 'localhost' || window.location.pathname.indexOf('dev.') > -1;   // todo: review if either 'localhost' or 'thoergondev.html', not both!
// try {
//    isDev = (await import("./puls.dev.mjs")).default;
// } catch (ignore) {}

//
// preload dev settings if exists
//

const devSettings = { isDev };
try {
    const module = (await import('./etc/universe.dev.mjs'));
    isDev = devSettings.isDev = true;
    if (module.DEV) Object.assign(devSettings, module.DEV);
} catch (ignore) {}

let protouniverse;

const deviceInfo = (() => {
    const agent = {
        browser  : { name: null, version: null, v: null, userAgent: null, app: null, os: null },
        mobile   : false,
        pointlock: false,
        agent    : false
    };

    var nVer         = navigator.appVersion;
    var nAgt         = navigator.userAgent;
    var browserName  = navigator.appName;
    var fullVersion  = '' + parseFloat(navigator.appVersion);
    var majorVersion = parseInt(navigator.appVersion, 10);
    var nameOffset, verOffset, ix;
    agent.pointlock  = 'pointerLockElement' in document ||
                       'mozPointerLockElement' in document ||
                       'webkitPointerLockElement' in document;

    // In Opera, the true version is after "Opera" or after "Version"
    if ((verOffset = nAgt.indexOf("Opera")) !== -1) {
        browserName = "Opera";
        fullVersion = nAgt.substring(verOffset + 6);
        if ((verOffset = nAgt.indexOf("Version")) !== -1)
            fullVersion = nAgt.substring(verOffset + 8);
    }
    // In MSIE, the true version is after "MSIE" in userAgent
    else if ((verOffset = nAgt.indexOf("MSIE")) !== -1) {
        browserName = "Microsoft Internet Explorer";
        fullVersion = nAgt.substring(verOffset + 5);
    }
    // In Chrome, the true version is after "Chrome"
    else if ((verOffset = nAgt.indexOf("Chrome")) !== -1) {
        browserName = "Chrome";
        fullVersion = nAgt.substring(verOffset + 7);
    }
    // In Safari, the true version is after "Safari" or after "Version"
    else if ((verOffset = nAgt.indexOf("Safari")) !== -1) {
        browserName = "Safari";
        fullVersion = nAgt.substring(verOffset + 7);
        if ((verOffset = nAgt.indexOf("Version")) !== -1)
            fullVersion = nAgt.substring(verOffset + 8);
    }
    // In Firefox, the true version is after "Firefox"
    else if ((verOffset = nAgt.indexOf("Firefox")) !== -1) {
        browserName = "Firefox";
        fullVersion = nAgt.substring(verOffset + 8);
    }
    // In most other browsers, "name/version" is at the end of userAgent
    else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) <
             (verOffset = nAgt.lastIndexOf('/'))) {
        browserName = nAgt.substring(nameOffset, verOffset);
        fullVersion = nAgt.substring(verOffset + 1);
        if (browserName.toLowerCase() === browserName.toUpperCase()) {
            browserName = navigator.appName;
        }
    }
    // trim the fullVersion string at semicolon/space if present
    if ((ix = fullVersion.indexOf(";")) !== -1)
        fullVersion = fullVersion.substring(0, ix);
    if ((ix = fullVersion.indexOf(" ")) !== -1)
        fullVersion = fullVersion.substring(0, ix);

    majorVersion = parseInt('' + fullVersion, 10);
    if (isNaN(majorVersion)) {
        fullVersion  = '' + parseFloat(navigator.appVersion);
        majorVersion = parseInt(navigator.appVersion, 10);
    }
    agent.browser.name      = browserName;
    agent.browser.version   = fullVersion;
    agent.browser.v         = majorVersion;
    agent.browser.app       = navigator.appName;
    agent.browser.userAgent = navigator.userAgent;
    var OSName              = "Unknown OS";
    if (navigator.appVersion.indexOf("Win") !== -1)   OSName = "Windows";
    if (navigator.appVersion.indexOf("Mac") !== -1)   OSName = "MacOS";
    if (navigator.appVersion.indexOf("X11") !== -1)   OSName = "UNIX";
    if (navigator.appVersion.indexOf("Linux") !== -1) OSName = "Linux";

    agent.browser.os = OSName;
    agent.mobile     = (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);

    agent.name = browserName + ' on ' + OSName;
    return agent
})();

//
// source
//

async function source(specifier) {
    const res = await fetch(specifier);
    if (!res.ok) return;
    const source = await res.text();
    return source;
}

//-------------------------------------------------------------



/*
 * define a global for 'thoregon' beside the 'universe'
 */
const thoregon = {};

// *** some test methods
Object.defineProperties(thoregon, {
    'ui'               : { value: true, configurable: false, enumerable: true, writable: false },
    'isBrowser'        : { value: true, configurable: false, enumerable: true, writable: false },
    'isReliant'        : { value: true, configurable: false, enumerable: true, writable: false },
    'isNode'           : { value: false, configurable: false, enumerable: true, writable: false },
    'isSovereign'      : { value: false, configurable: false, enumerable: true, writable: false },
    'nature'           : { value: 'reliant', configurable: false, enumerable: true, writable: false },
    'density'          : { value: 'rich', configurable: false, enumerable: true, writable: false },
    'embedded'         : { value: false, configurable: false, enumerable: true, writable: false },
    // todo [OPEN]: autoselect other themes like iOS, get user selected theme from 'localStorage'
    'uitheme'          : { value: 'material', configurable: false, enumerable: true, writable: false },
    'isDev'            : { value: isDev, configurable: false, enumerable: true, writable: false },
    'debug'            : { value: false, configurable: false, enumerable: true, writable: false },
    'birth'            : { value: Date.now(), configurable: false, enumerable: true, writable: false },
    'since'            : { get: () => Date.now() - thoregon.birth, configurable: false, enumerable: true },
    'deviceInfo'       : { value: deviceInfo, configurable: false, enumerable: true, writable: false },
    'checkpoint'       : { value: (msg) => console.log(msg, Date.now() - thoregon.birth), configurable: false, enumerable: true, writable: false },
    'activateFirewalls': { value: async () => await protouniverse?.activateFirewalls(), configurable: false, enumerable : true, writable: false },
    'source'           : { value: source, configurable: false, enumerable: false, writable: false },
    'loadTestData'     : { value: true, configurable: false, enumerable: true, writable: false },
    'webRTC'           : { value: window.self === window.top, configurable: false, enumerable: true, writable: false }, // in iframes, webRTC is not available due to security (why?)
});

/*
 * check if loaded embedded in another site
 * e.g. via a widget hatch
 * may need
 */

let m = import.meta;

let lorigin = new URL(window.location.href).origin;
let morigin = new URL(m.url).origin;
if (lorigin !== morigin) {
    Object.defineProperty(thoregon, 'delivery', { value: morigin, configurable: false, enumerable: true, writable: false});
}

// todo: encapsulate with its own processing context (vm-shim);
//       replace global variables with mockups to allow checks for existence in strict mode

/*
 * defines some global properties
 */
const properties = {
    'thoregon' :    { value: thoregon,                  configurable: false, enumerable: true, writable: false },
    // *** define also the 'process' as global variable that it can be tested
    // 'process' :     { value: { env: {} },                  configurable: false, enumerable: true, writable: false },
};

// if missing define 'globalThis'
if (!window.globalThis) properties.globalThis = { value: window, configurable: false, enumerable: true, writable: false};

const puls = {};

// define globals
Object.defineProperties(window, properties);

//
// Crypto polyfills
//

if (globalThis.crypto) {
    // prevent timing side channel attacks
    crypto.timingSafeEqual = function timingSafeEqual(a, b) {
        if (!Buffer.isBuffer(a)) throw new TypeError('First argument must be a buffer');
        if (!Buffer.isBuffer(b)) throw new TypeError('Second argument must be a buffer');
        if (a.length !== b.length) return false;

        var len = a.length
        var out = 0
        var i = -1
        while (++i < len) {
            out |= a[i] ^ b[i]
        }
        return out === 0
    }
}

// can be changed by setting: thoregon.swtimeout = n
// if thoregon.swtimeout <= 0 not timeout is used
const SERVICEWORKERREQUESTTIMEOUT = 15000;

//
//
//

async function maintainRepositories(puls) {
    try {
        // this is an initial repository list when there was no
        const reposettings = (await import("./repos.mjs")).default;
        if (!reposettings) return;
        // todo [OPEN]:
        //  - load repository list from local settings (indexeddb)
        //  - maintain repository list when SSI signs on
        const repolist = { PRIVATE: {}, ...reposettings };
        await puls.repo(repolist);
    } catch (ignore) {
        // no initial repositories defined
        // but do some logging
        console.log("No repo.mjs", ignore);
    }
}

/**
 * Protouniverse
 */

export default class ProtoUniverse {

    constructor(props) {
        this._requestQ = {};
    }

    async inflate() {
        thoregon.checkpoint("§§ protouniverse inflate");
        try {
            // install service worker with the IPFS peer
            await this.installServiceWorker();
        } catch (e) {
            // todo: handle error properly
            console.log('%% Service worker registration failed:', e);
            return;
        }
        await doAsync();

        // setup the communication interface to the service worker
        this.definePulsInterface();
        // set development mode
        if (devSettings?.isDev) {
            await puls.dev(devSettings);
            await timeout(100);
        }
        // add repositories
        await maintainRepositories(puls);

        // establish the IPFS loader
        // await this.initWorkers();

        // import basic THORE͛GON components
        thoregon.checkpoint("§§ protouniverse inflate 4");
        // const watchdog = setTimeout(() => window.location.reload(), 1500);
        const letThereBeLight = (await import('/evolux.universe/lib/reliant/letThereBeLight.mjs')).default;
        // clearTimeout(watchdog);
        thoregon.checkpoint("§§ protouniverse inflate 5");
        // and boot
        let universe = await letThereBeLight();

        thoregon.checkpoint("§§ start delta");

        // add puls as global
        universe.puls = Object.freeze(puls);
        window.puls   = universe.puls;

        // todo [OPEN]: now seal global objects and local DBs from direct access from app code

        // todo [REFACTOR]: cleanup 'prod' and 'dev' mode, introduce plugin
        if (!(universe.DEV?.ssi)) await dorifer.restartApp();
    }

    definePulsInterface() {
        //
        // define a communication channel to puls
        // todo: must be hidden for other loaded components
        //
        Object.assign(puls, {
            serviceWorkerRequest: async (...args)  => await this.serviceWorkerRequest(...args),
            reset               : async ()         => await this.serviceWorkerRequest({ cmd: 'reset' }),
            clear               : async (cache)    => await this.serviceWorkerRequest({ cmd: 'clearCache', cache }),
            state               : async ()         => await this.serviceWorkerRequest({ cmd: 'state' }),
            dev                 : async (settings) => await this.serviceWorkerRequest({ cmd: 'dev', settings }),
            repo                : async (settings) => await this.serviceWorkerRequest({ cmd: 'repo', settings }),
            inCache             : async (path)     => await this.serviceWorkerRequest({ cmd: 'inCache', path }),
            listCache           : async ()         => await this.serviceWorkerRequest({ cmd: 'listCache' }),
            refreshThoregon     : async (refreshUI = true) => {
                await this.serviceWorkerRequest({ cmd: 'refreshThoregonCache' });
                if (refreshUI) window.location.reload();
            },
        });
    }

    async installServiceWorker(opts) {
        const serviceWorker = navigator.serviceWorker;
        // todo [OPEN]: check if browser supports service workers -> hint to user 'use modern browser'
        let wasinstalled = false;

        if (serviceWorker.controller) {
            // console.log("%% service worker already loaded exists");
            registration = await serviceWorker.ready; // serviceWorker.controller;

            // check for a service worker update
            // the updated service worker automatically become active (skipWaiting) and claims all clients
            // no extra 'claim' message necessary like after first install
            registration.onupdatefound = (evt) => { /*console.log(">> ServiceWorker UPDATE", evt)*/ };
            await registration.update();

            wasinstalled = true;
            serviceWorker.addEventListener("message", async (event) => await this.serviceworkerMessage(event) );
        } else {
            // todo [REFACTOR]: check the support status for workers as module -> https://stackoverflow.com/questions/44118600/web-workers-how-to-import-modules
            /* support feature detection
                  try {
                    registration = await serviceWorker.register('pulssw.js', { type: 'module' });
                  } catch(error) {
                    registration = await serviceWorker.register('pulssw_0.js');
                  }
             */
            await serviceWorker.register('./pulssw.js', /*{ scope: '/', type: "module" }*/);
            registration = await serviceWorker.ready;

            serviceWorker.addEventListener("message", async (event) => await this.serviceworkerMessage(event) );
            // now wait to activate the service worker and let it claim its clients. this prevents a page reload
            // this is the case when a hard reload (with or w/o clear cache) happens
            // the first install does 'skipWaiting' and claims all clients
            await this.serviceWorkerRequest({ cmd: 'claim' });
        }

        return wasinstalled;
    }

    async serviceworkerMessage(event) {
        let data = event.data;

        // find handlers for the request
        let handlers = this._requestQ[data.cmd];
        if (!handlers) return;

        // cleanup Q
        delete this._requestQ[data.cmd];
        // continue processing response
        handlers.forEach(({ resolve, reject, watchdog }) => {
            if (watchdog) clearTimeout(watchdog);
            (data.error) ? reject(error) : resolve(data);
        });
    }

    /**
     * send a request to the service worker
     * return Promise with the response
     */
    /*async*/ serviceWorkerRequest(msg) {
        return new Promise(((resolve, reject) => {
            let handlers = this._requestQ[msg.cmd];
            let watchdog;
            if (!handlers) {
                handlers = [];
                this._requestQ[msg.cmd] = handlers;
                const timeout = this.getSWTimeout();
                if (timeout > 0) {
                    // only the first request for the same command needs a timeout
                    watchdog = setTimeout(() => {
                        let handlers = this._requestQ[msg.cmd];
                        delete this._requestQ[msg.cmd];
                        if (handlers) handlers.forEach(({ reject }) => {
                            reject(new Error("Requets timeout"));
                        });
                    }, timeout);
                }
            }
            handlers.push({ resolve, reject, watchdog });
            registration.active.postMessage(msg);
        }));
    }

    getSWTimeout() {
        // first check is it is set by developer
        if (thoregon.swtimeout != undefined) return thoregon.swtimeout <= 0 ? -1 : thoregon.swtimeout;
        // in dev mode no timeout (for debugging)
        if (thoregon.isDev) return -1;
        // in all other cases use default timeout
        return SERVICEWORKERREQUESTTIMEOUT;
    }

    // todo [REFACTOR]: move to universe.config
    async initWorkers() {
        await this.initIpfsLoader();
        await this.initMatterWorker();
/*
        sworker.port.onmessage = (evt) => {
            console.log("$$ msg from sworker -> ", evt.data);
        }
        sworker.port.start();
        sworker.port.postMessage(["A", "1"]);
        console.log("$$ msg sent to sworker");
        registration.active.postMessage({ cmd: 'loader', name:'ipfs', kind: 'ipfs', port: sworker.port }, [sworker.port]);
*/
    }

    async initIpfsLoader() {
        let res = await this.serviceWorkerRequest({ cmd: 'exists', name: 'ipfs' });
        if (res.exists) return;     // ipfs loader is running
        var sworker = new SharedWorker('/evolux.matter/lib/loader/ipfsloader.mjs', { name: 'IPFS loader', type: 'module' });
        let port = sworker.port;
        port.start();
        return await this.serviceWorkerRequest({ cmd: 'loader', name:'ipfs', kind: 'ipfs', cache: treu, port }, [port]);
    }

    async initMatterWorker() {
        let res = await this.serviceWorkerRequest({ cmd: 'exists', name: 'matter' });
        if (res.exists) return;     // matter loader is running
        // var sworker = new SharedWorker('/evolux.matter/lib/loader/matterloader.mjs', { name: 'Matter loader', type: 'module' });
        // let port = sworker.port;
        // port.start();
        // return await this.serviceWorkerRequest({ cmd: 'loader', name:'matter', kind: 'matter', cache: false, port }, [port]);
    }

    async activateFirewalls() {
        console.log("§§ protouniverse activate firewalls");
    }
}

(async () => {
    // console.log('** PULS inflate universe');
    protouniverse = new ProtoUniverse();
    await protouniverse.inflate();
    // new Spike().doit();
    // console.log('** PULS beats');
})();
