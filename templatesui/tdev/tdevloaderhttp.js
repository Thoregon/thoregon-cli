/**
 *
 * todo [OPEN]:
 *  - use ReadStream instead of reading chunks manually
 *  - listen to fs changes, update resource
 *
 * @author: blukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

const wsroot = `ws:${location.host}`;

const isGET = (request) => request.method === 'GET';

class TDevLoaderHttp extends Loader {

    /*
     * Loader API
     */

    // init WebSocket
    async doStart() {
        this.stateReady();
    }

    async doStop() {}   // nothing to do

    async doFetch(request) {
        const response = await fetch(request);
        return response;
    }

    /*    async doFetch(request) {
                let pathname = new URL(request.url).pathname;
                let head = await this.head(pathname)
                if (head.error) return;
                // redirect to index if exists
                if (head.type !== 'file') {
                    if (head.hasindex && isGET(request)) {
                        return Response.redirect(pathjoin(pathname,'index.mjs'), 302);    // 301: permanently moved, 302: temporarily moved
                    } else if (head.type === 'dir') {
                        let meta = { headers: {
                                'Content-Type': 'application/json'
                            } };
                        return new Response(JSON.stringify(head), meta);
                    }
                    return;
                }
                let mime = head.mime || puls.getContentType(pathname);
                let stream = await this.read(pathname, head.size);
                let meta = { headers: {
                    'Content-Type':  mime
                } };
                return new Response(stream, meta);
            }*/

}

(async () => await puls.useDevLoader(new TDevLoaderHttp()))();

// (async () => await puls.useLoader(new TDevLoaderHttp(), { priority: 0 , cache: false }) )()
