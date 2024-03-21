
// just define an async forEach
if (!self.forEach) {
    self.forEach = async (collection, fn) => {
        if (!collection || !Array.isArray(collection)) return ;
        for (let index = 0; index < collection.length; index++) {
            await fn(collection[index], index, collection);
        }
    };
}

// simple function check
self.isFunction = (obj) => typeof(obj) === 'function';
// async timeout fn
self.timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// just push back to the event loop and perform following steps 'async' (simulated)
self.doAsync = () => timeout(0);

// very simple path joinutil
// todo: include a better path util like http://jvilk.com/browserfs/1.4.1/modules/_core_browserfs_.html or https://github.com/browserify/path-browserify/blob/master/index.js
self.pathjoin = (...parts) => parts.length === 0 ? '' : parts[0] + (!parts[0].endsWith('/') && parts.length > 1 ? '/' : '') + (pathjoin(...parts.slice(1, parts.length)));

// get the path from the request url
self.onlyPath = (request) => {
    let url = request.url || request;
    return new URL(url).pathname;
}

// async tiemout
self.timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));
