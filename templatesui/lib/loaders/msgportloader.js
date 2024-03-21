/**
 *
 * todo:
 *  - introduce timeout
 *  - introduce heartbeat
 *      - restart of shared worker:
 *          - msgloader -> puls -> main (one of)
 *          - main - port -> puls -> msgloader
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

let canceled = false;

class MsgPortLoader extends Loader {

    constructor({ name, kind, port } = {}) {
        super();
        Object.assign(this, { name, kind, port });
        this.pending = {};
    }

    async doStart() {
        this.port.start();
        this.port.addEventListener('message', (evt) => this.handleResponse(evt));
        // get responsibility from shared loader
        this.port.postMessage({ cmd: 'responsibility' });
        // setTimeout(() => this.heartbeat(), 1000);
    }

    async doStop() {
        canceled = true;
    }

    heartbeat() {
        if (canceled) return;
        this.port.postMessage({ cmd: 'ping' });
    }

    handleResponse(evt) {
        let res = evt.data;
        switch (res.cmd) {
            case 'responsibility':
                this.pathmatch = res.match;
                break;
            case 'fetch':
                let handlers = this.pending[res.url];
                if (!handlers) return;  // log?
                delete this.pending[res.url];
                handlers.forEach(({ resolve, reject }) => {
                    let meta = { headers: {
                            'Content-Type':  'text/plain'
                        } };
                    resolve(new Response(res.body, meta));  // todo: if multiple handlers 'tee' the stream
                });
/*
                if (res.body) {
                    handlers.forEach(({ resolve, reject }) => resolve(body));
                } else {
                    handlers.forEach(({ resolve, reject }) => reject());
                }
*/
        }
    }


    canHandle(request) {
        let url      = new URL(request.url);
        let pathname = url.pathname;
        // check if this loader is responsible for the request url
        return this.matches(pathname);
    }

    matches(url) {
        return this.pathmatch ? url.match(this.pathmatch) : false;
    }

    /*async*/ doFetch(request) {
        return new Promise((resolve, reject) => {
            let url      = new URL(request.url);
            let pathname = url.pathname;
            // check if this loader is responsible for the request url
            if (!this.matches(pathname)) {
                resolve();
                return;
            }
            let handlers = this.pending[pathname];
            if (!handlers) {
                handlers = [];
                this.pending[pathname] = handlers;
                try {
                    this.port.postMessage({ cmd: 'fetch', url: pathname });
                } catch (e) {
                    console.log("MessagePortLoader", e);
                    resolve();  // next handler
                }
            }
            handlers.push({ resolve, reject });
        });
    }
}
