/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import SEA                     from '/evolux.everblack/lib/crypto/sea.mjs'
import { Automerge, Peer }     from "/thoregon.neuland/modules/browserpeer/index.mjs";
import BrowserLifecycleEmitter from "/thoregon.neuland/modules/browserpeer/browserlifecycleemitter.mjs";
import NeulandStorageAdapter   from "/thoregon.neuland/modules/browserpeer/idxdbneulandstorageadapter.mjs";
import NeulandDB               from "/thoregon.neuland/src/storage/neulanddb.mjs";
import P2PNetworkPolicy        from "/thoregon.neuland/src/p2p/p2pnetworkpolicy.mjs";
import PeerJSNetworkAdapter    from "/thoregon.neuland/src/p2p/peerjsnetworkadapter.mjs";
import ChannelRelayAdapter     from "/thoregon.neuland/src/network/channel/channelrelayadapter.mjs";
import SyncManager             from "/thoregon.neuland/src/sync/syncmanager.mjs";
import MQ                      from "/thoregon.neuland/src/mq/mq.mjs";
import IdentityReflection      from '/thoregon.identity/lib/identityreflection.mjs';
import Dorifer                 from '/thoregon.truCloud/lib/dorifer.mjs';
import Aurora                  from "/thoregon.aurora";
import LogSink                 from "/evolux.universe/lib/reliant/logsink.mjs";
import ThoregonDecorator       from "/thoregon.archetim/lib/thoregondecorator.mjs";

thoregon.checkpoint("init Thoregon System 1");

//
// crypto, safety & security
//

universe.$everblack = SEA;
universe.$lifecycle = new BrowserLifecycleEmitter();

//
// network policies & adapters,
//

const NETWORK_ADAPTER = thoregon.webRTC ? PeerJSNetworkAdapter : ChannelRelayAdapter;

universe.$Peer      = Peer;
universe.$netconfig = {
    policies: [P2PNetworkPolicy],
    p2p     : {
        adapters  : [NETWORK_ADAPTER],
        knownPeers: universe.KNOWN_PEERS,
        signaling : {
            host: universe.PEERSIGNALING,
            port: 9000,
            // path  : "/myapp",
        }
    },
};

const netopt  = {};
universe.$net = universe.netconfig.policies.map((Policy) => new Policy(netopt));

export default async () => {
    //
    // crdt & sync
    //

    universe.$Automerge = Automerge;
    universe.$syncmgr   = SyncManager.setup();
    universe.$mq        = MQ.setup();

    thoregon.checkpoint("init Thoregon System 2");

    //
    // components
    //

    const neuland      = new NeulandDB();
    const neulandlocal = new NeulandDB();

    thoregon.checkpoint("init Thoregon System 3");
    const identity = new IdentityReflection();
    thoregon.checkpoint("init Thoregon System 4");
    const aurora = Aurora; // new Aurora();
    thoregon.checkpoint("init Thoregon System 5");
    const dorifer = new Dorifer();
    thoregon.checkpoint("init Thoregon System 6");

    neuland.init(NeulandStorageAdapter, universe.NEULAND_STORAGE_OPT);
    await neuland.start();
    neulandlocal.init(NeulandStorageAdapter, universe.NEULANDLOCAL_STORAGE_OPT);
    await neulandlocal.start();


    thoregon.checkpoint("init Thoregon System 7");
    await identity.start();
    thoregon.checkpoint("init Thoregon System 8");
    await aurora.start();
    thoregon.checkpoint("init Thoregon System 9");
    await dorifer.start();
    thoregon.checkpoint("init Thoregon System 10");

    //
    // testing & debugging
    //
    await LogSink.init();
    universe.$logsink = LogSink;

    universe.p2ppolicy  = () => universe.net[0];
    universe.p2padapter = () => universe.p2ppolicy().net[0];
}

//
// shutdown
//

universe.atDusk(async (universe, code) => {
    universe.neuland?.stop();
    universe.neulandlocal?.stop();
})
