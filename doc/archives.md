Archives
========

--> see [commander.js](https://github.com/tj/commander.js) how to process command line options and params

## make thoregon archive
    $ thor thoregon -k [browser|node]

## make archive
pack one module/component

    $ thor pack -i ./neulandidentity.mjs -o easypay-dashboard /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/applications/easypay-application-dashboard
    $ thor pack -i ./neulandidentity.mjs /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/home/easypay-home

pack mutltiple components with option -m
packs all components contained under the specified directory

    $ thor pack -i ./neulandidentity.mjs -o greenpaytest -m /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/test

skip modules in the directory

    $ thor pack -i ./neulandidentity.mjs -o greenpaymodules -s easypay-module-invoicegenerator -m /private/var/dev/Projects/b-coop/thatsme/thoregon/easypay/modules

[todo] pack multiple components, specify each path to the component
