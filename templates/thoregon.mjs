/**
 * Collection of entrypoints, objects and classes from thoregon
 *
 * @author: blukassen
 */

import letThereBeLight      from '/evolux.universe';

(async () => {
    try {
        const universe              = await letThereBeLight();
        thoregon.checkpoint("§§ start delta");
    } catch (err) {
        console.log(err);
    }
})();
