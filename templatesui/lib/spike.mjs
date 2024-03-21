// the redefinition of
const indexedDB = { name: 'indexedDB' };
/*
the expanded code redefining all globals must be injected for the firewwall
Object.entries(window).forEach(([name, obj]) => {
    if (!wrappers.hasOwnProperty(name)) wrappers[name] = { replace: name };
})
*/
const window = { indexedDB, Array, Object };
// window.indexedDB = indexedDB;   // Error -> Cannot set property indexedDB of #<Window> which has only a getter

/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

export default class Spike {

  doit() {
      debugger;
      console.log(window);
      console.log(indexedDB);
  }

}
