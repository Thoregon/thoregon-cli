/**
 *
 * @see also with 'no-cors' there may be opaque responses which can not be used in JS
 *  - https://fetch.spec.whatwg.org/#concept-filtered-response-opaque
 *  - https://whatwebcando.today/articles/opaque-responses-service-worker/
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

class WebLoader extends Loader {

    canHandle(request) {
        let url      = new URL(request.url);
        let pathname = url.pathname;
        // check if this loader is responsible for the request url
        return pathname.startsWith("/@web/");
    }

    async doFetch(request) {
        const url      = new URL(request.url);
        const pathname = url.pathname;
        const weburl   = 'https://' + pathname.substring(5);
        const response = await fetch(new Request(weburl, { mode: 'no-cors', cache: 'no-cache', redirect: 'follow', referrerPolicy: 'no-referrer' }));
        return response;
    }
}

(async () => await puls.useLoader(new WebLoader(), { priority: 9 , cache: false }) )()
