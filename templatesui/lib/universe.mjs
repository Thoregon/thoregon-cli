/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import PeerJSNetworkAdapter from "./relay/peerjsnetworkadapter.mjs";
import PolicyRelay          from "./relay/policyrelay.mjs";
import Peer                 from "../ext/peerjs/peerjs.min.mjs";

import { default as KNOWN_PEERS }        from '../etc/knownpeers.mjs';

//export const KNOWN_PEERS = ['PeerJS-ynGhbGJjEh3BCNH1mSBTykj89a7PXNzO'];

export default class Universe {

    setup() {
        this.Peer = Peer;

        this.netconfig = {
            policies: [PolicyRelay],
            p2p     : {
                adapters  : [PeerJSNetworkAdapter],
                knownPeers: KNOWN_PEERS,
                signaling : {
                    host: "peer.thoregon.io",
                    port: 9000,
                    // path  : "/myapp",
                }
            }
        };
        const Policy  = this.netconfig.policies[0];
        const Adapter = this.netconfig.p2p.adapters[0];
        this.net = new Policy(Adapter, {});
    }

    random(l) {
        return btoa( String.fromCharCode( ...crypto.getRandomValues(new Uint8Array(l ?? 32)) ) ).replaceAll(/[\/|+|=]/g,'').substring(0, l ?? 32);
    }
}

if (!window.universe) {
    const universe = window.universe = new Universe();
    universe.setup();
}
