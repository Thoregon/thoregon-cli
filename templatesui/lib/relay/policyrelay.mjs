/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

const debuglog = (...args) => {}; // console.log("## PolicyRelay", universe.inow, ":", ...args); // console.log("PolicyRelay", universe.inow, ":", ...args);  // {}
const debugerr = (...args) => console.error("## PolicyRelay", universe.inow, ":", ...args);

export default class PolicyRelay {

    constructor(Adapter, opt) {
        this._ready        = false;
        this._channelready = false;
        this._Q            = [];
        this._conns        = {};
        const adapter      = this._adapter = new Adapter(this, opt);
        adapter.prepare(() => this.adapterReady(adapter));
        debuglog("created");
    }

    relayTo(channel) {
        this._channel = channel;
        window.addEventListener('message', (evt) => this.relayReceived(evt));
        const knownPeers = this._adapter.knownPeers;
        this._channel.postMessage({ type: 'netrelay', req: { cmd: 'knownPeers', knownPeers } }, '*');
        debuglog("relayTo", channel);
    }

    adapterReady(adapter) {
        this._ready  = true;
        this._peerid = adapter.peerid;
    }

    send2Channel(req) {
        if (!this.channelReady()) {
            if (this._Q) this._Q.push(req);
            debuglog("send2Channel: enqueued");
            return;
        }
        this._channel.postMessage({ type: 'netrelay', req }, '*');
        debuglog("send2Channel", req);
    }

    channelReady() {
        return this._channelready;
    }

    //
    // relay
    //

    relayReceived(evt) {
        if (evt?.data?.type !== 'netrelay') return;
        // console.log("Relay received:", evt);
        const data    = evt.data;
        const cmd     = data.cmd;
        const req     = data.req;
        const meta    = data.meta;
        const adapter = this._adapter;
        debuglog("relayReceived", cmd, req, meta);
        switch (cmd) {
            case 'channelReady':
                this._channelready = true;
                const knownPeers = this._adapter.knownPeers;
                this.send2Channel({ cmd: 'relayReady', peerid: this._peerid, knownPeers });
                this.processQ();
                break;
            case 'broadcast':
                const exceptconn = meta;
                adapter.broadcast(req, exceptconn);
                break;
            case 'send':
                const otherPeerid = meta;
                adapter.send(otherPeerid, req);
                break;
        }
    }

    processQ() {
        const Q = this._Q;
        delete this._Q;
        Q.forEach((relay) => this.send2Channel(relay));
        debuglog("processQ");
    }

    //
    // relay API to channel (policy)
    //

    connectionEstablished(conn, adapter) {
        this._conns[conn.connectionId] = conn;  // todo [OPEN]: add cleanup closed connections
        const req = { cmd: 'connectionEstablished', conn: conn.connectionId };
        this.send2Channel(req);
        debuglog("connectionEstablished");
    }

    wasReceived(data) {
        const req = { cmd: 'wasReceived', data };
        this.send2Channel(req);
        debuglog("wasReceived");
    }

    received(data, conn, adapter) {
        if (!this._conns[conn.connectionId]) this._conns[conn.connectionId] = conn;
        const peerid = conn.peer;
        const req = { cmd: 'received', data, conn: conn.connectionId, from: peerid };
        this.send2Channel(req);
        debuglog("received");
    }

}
