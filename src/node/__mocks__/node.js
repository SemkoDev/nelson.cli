const { Node: BaseNode, DEFAULT_OPTIONS: DEFAULT_NODE_OPTIONS } = require('../node');
const { getRandomInt } = require('../tools/utils');
const { IRI } = require('./iri');

const DEFAULT_OPTIONS = {
    ...DEFAULT_NODE_OPTIONS,
    localNodes: true,
    beatInterval: 2,
    cycleInterval: 3,
    epochInterval: 30,
    lazyLimit: 6,
    testnet: true,
    temporary: true,
};

/**
 * This is a mock for the "real" node. What it does are several things:
 *
 * 1. Mock away IRI backend so we do not start it. We just want to test the P2P functionality.
 * 2. Create a separate neighbor database for each node.
 * 3. Report stats to the parent process
 *
 * @class Node
 */
class Node extends BaseNode {
    constructor (options) {
        super({ ...DEFAULT_OPTIONS, ...options });
        this.sendStats = this.sendStats.bind(this);
        setInterval(this.sendStats, 1000);
    }

    _getIRI () {
        const { APIPort, TCPPort, UDPPort, testnet, silent, temporary } = this.opts;

        return (new IRI({
            APIPort, TCPPort, UDPPort, testnet, silent, temporary,
            logIdent: `${this.opts.port}::IRI`
        })).start().then((iri) => {
            this.iri = iri;
            return iri;
        })
    }

    _setPublicIP () {
        this.ipv4 = 'localhost';
        return Promise.resolve(0);
    }

    _onIRIHealth () {
        Array.from(this.sockets.keys()).forEach((peer) => {
            peer.updateConnection({
                numberOfAllTransactions: getRandomInt(0, 1000),
                numberOfNewTransactions: getRandomInt(0, 150),
                numberOfRandomTransactionRequests: getRandomInt(0, 100),
                numberOfInvalidTransactions: getRandomInt(0, 10)
            });
        })
    }

    /////////////////////////////////// MOCK SPECIFICS ///////////////////////////////////

    sendStats () {
        const sockets = Array.from(this.sockets.values());

        process.send({
            isMaster: this.opts.isMaster,
            peers: this.list ? this.list.all().map((p) => p.data.port) : [],
            connections: {
                list: Array.from(this.sockets.keys()).filter(k => this.sockets.get(k).readyState === 1).map(
                    (peer) => `${peer.data.port}`
                ),
                connecting: sockets.filter(s => s.readyState === 0).length,
                connected: sockets.filter(s => s.readyState === 1).length,
                closed: sockets.filter(s => s.readyState > 1).length
            }
        });
    }
}

module.exports = {
    DEFAULT_OPTIONS,
    Node
};
