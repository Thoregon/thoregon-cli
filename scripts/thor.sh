#!/usr/bin/env bash
#
# NODE="/usr/local/opt/nvm/versions/node/v18.7.0/bin/node"
NODE="node"
$NODE --no-warnings --loader $THOREGON_HOME/evolux.modules/evolux.universe/bootloader.mjs $THOREGON_HOME/thoregon-cli/cli/thor.mjs "$@"
