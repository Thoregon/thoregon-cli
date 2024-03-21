/**
 * This is a base class for loaders
 *
 * todo:
 *  - introduce subscriptions to update resources automatically
 *  - widget support
 *      -> see ModuleResolver.buildWidgetScript
 *  - Sandbox & instrumentation: replacements when special URL ...?sandbox=true
 *      - hooks to pipe through the content
 *
 *      -> see https://github.com/googlearchive/caja
 *      -> see https://developers.google.com/closure/
 *      - add local variables
 *      -> const _window = {}, _document = {};
 *      - replace globals which are direcly referenced
 *          - array of allowed globals
 *          - wrap some globals (some with
 *              - import() -> add '?sandbox=true' to the URL
 *              - indexedDB
 *              - ...
 *      - extend 'import from' URLs with '?sandbox=true'
 *
 * @author: blukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

const debuglogL = (...args) => debuglog; // { logentries.push({ dttm: Date.now(), ...args }); console.log(...args); };

class Loader {

    constructor(options) {
        this.options = options;
        this._state  = 'init';
        this._readyQ = [];
        this._settings = {};
    }

    /*
     * implement by subclasses
     */

    async doStart() { return true; }
    async doFetch(request) {}
    async doStop() {}

    use(settings) {
        this._settings = settings;
    }
    //
    // override if necessary
    //

    canHandle(request) {
        return true;
    }

    /*
     * lifecycle
     */

    init(...options) {
        this.options = options;
    }

    start(settings) {
        if (settings) this._settings = settings;
        (async () => {
            this.stateStarting();
            try {
                if (await this.doStart()) {
                    debuglogL("Loader > started ready");
                    this.stateReady();
                } else {
                    debuglogL("Loader > started");
                }
            } catch (e) {
                console.log("$$ Loader error at start:", e);
                this._state = 'error';
            }
        })();
    }

    /*async*/ fetch(request) {
        return new Promise(async (resolve, reject) => {
            const url = request.url;
            // check if the loader can process the request, let next loader handle the request
            if (!this.canHandle(request)) { debuglog("Loader > can't handle", url); resolve(); return; }
            if (this.isPaused())          { debuglog("Loader > is paused", url); resolve(); return; }
            if (!this.isActive())         { debuglog("Loader > is not active ", url); resolve(); return; }
            await this.untilReady();
            try {
                debuglog("Loader > b4 doFetch", url);
                let res = await this.doFetch(request);
                resolve(res);
            } catch (e) {
                debuglog("Loader > ", url);
                console.log("$$ Loader", e);
                resolve();
            }
        });
    }

    stop() {
        (async () => {
            this.stateTerminating();
            try {
                await this.doStop();
            } catch (ignore) {
                console.log('Loader', e);
            }
            this.stateTerminated();
        })();
    }

    pause() {
        this.statePaused();
    }

    resume(settings) {
        this._settings = settings;
        this.stateReady();
    }

    /*
     * states
     */

    isActive() {
        return !(this._state === 'error' || this._state === 'terminating' || this._state === 'terminated');
    }

    isReady() {
        return this._state === 'ready';
    }

    /*async*/ untilReady() {
        return new Promise((resolve) => {
            if (this.isReady()) return resolve();
            debuglogL("Loader > not ready, enqueue request");
            this._readyQ.push(resolve);
        })
    }

    async processReadyQ() {
        const readyQ = this._readyQ;
        debuglogL(`Loader > process ready Q: ${readyQ.length}`);
        if (readyQ.length === 0) return;
        this._readyQ = [];
        readyQ.forEach((resolve) => resolve());
    }

    isPaused() {
        return this._state === 'paused';
    }

    stateStarting() {
        debuglogL("Loader > starting");
        this._state = 'starting';
    }

    stateReady() {
        debuglogL("Loader > ready");
        this._state = 'ready';
        this.processReadyQ();
    }

    stateError() {
        debuglogL("Loader > error");
        this._state = 'error';
    }

    stateTerminating() {
        debuglogL("Loader > terminating");
        this._state = 'terminating';
    }

    stateTerminated() {
        debuglogL("Loader > terminated");
        this._state = 'terminated';
    }

    statePaused() {
        debuglogL("Loader > paused");
        this._state = 'paused';
    }

}
