const WebSocket = require('ws');
const ip = require('ip');
const pip = require('public-ip');
const { Base } = require('./base');
const { Heart } = require('./heart');
const { IRI, DEFAULT_OPTIONS: DEFAULT_IRI_OPTIONS } = require('./iri');
const { PeerList, DEFAULT_OPTIONS: DEFAULT_LIST_OPTIONS } = require('./peer-list');
const { getPeerIdentifier, getRandomInt } = require('./utils');

const DEFAULT_OPTIONS = {
    cycleInterval: 60,
    epochInterval: 300,
    beatInterval: 10,
    dataPath: DEFAULT_LIST_OPTIONS.dataPath,
    // TODO: add process and HTTP api interfaces to query the node on current status
    port: 16600,
    apiPort: 17600,
    IRIPort: DEFAULT_IRI_OPTIONS.port,
    TCPPort: 15600,
    UDPPort: 14600,
    weightDeflation: 0.65,
    incomingMax: 8,
    outgoingMax: 6,
    maxShareableNodes: 16,
    localNodes: false,
    isMaster: false,
    temporary: false,
    autoStart: false,
    logIdent: 'NODE',
    neighbors: [],
    onReady: (node) => {},
    onPeerConnected: (peer) => {},
    onPeerRemoved: (peer) => {},
};

// TODO: add node tests. Need to mock away IRI for this.
class Node extends Base {
    constructor (options) {
        super({ ...DEFAULT_OPTIONS, ...options });
        this.opts.logIdent = `${this.opts.port}::NODE`;

        this._onCycle = this._onCycle.bind(this);
        this._onEpoch = this._onEpoch.bind(this);
        this._onTick = this._onTick.bind(this);
        this._removeNeighbor = this._removeNeighbor.bind(this);
        this._removeNeighbors = this._removeNeighbors.bind(this);
        this._addNeighbor = this._addNeighbor.bind(this);
        this._addNeighbors = this._addNeighbors.bind(this);
        this.connectPeer = this.connectPeer.bind(this);
        this.reconnectPeers = this.reconnectPeers.bind(this);
        this.end = this.end.bind(this);

        this._ready = false;
        this.sockets = new Map();

        this.opts.autoStart && this.start();
    }

    /**
     * Starts the node server, getting public IP, IRI interface, Peer List and Heart.
     */
    start () {
        return this._setPublicIP().then(() => {
            return this._getIRI().then((iri) => {
                if (!iri) {
                    throw new Error('IRI could not be started');
                }
                return this._getList().then(() =>{
                    const { cycleInterval, epochInterval, silent } = this.opts;

                    this._createServer();

                    this.heart = new Heart({
                        silent,
                        cycleInterval,
                        epochInterval,
                        logIdent: `${this.opts.port}::HEART`,
                        onCycle: this._onCycle,
                        onTick: this._onTick,
                        onEpoch: this._onEpoch,
                    });

                    this._ready = true;
                    this.opts.onReady(this);
                    this.heart.start();

                    return this;
                }).catch((err) => { throw err; })
            }).catch((err) => { throw err; })
        });
    }

    /**
     * Ends the node, closing HTTP server and IRI backend.
     * @returns {Promise.<boolean>}
     */
    end () {
        this.log('terminating...');

        this.heart && this.heart.end();

        const closeServer = () => {
            return new Promise((resolve) => {
                if (this.server) {
                    this.server.close();
                    this.sockets = new Map();
                }
                resolve(true);
            })
        };

        return closeServer().then(() => {
            this._ready = false;
            return this.iri
                ? this.iri.end()
                : true;
        })
    }

    /**
     * Sets a new peer list and returns a list of loaded peers.
     * @returns {Promise.<Peer[]>}
     * @private
     */
    _getList () {
        const { localNodes, temporary, silent, neighbors, dataPath } = this.opts;
        this.list = new PeerList({
            multiPort: localNodes,
            temporary,
            silent,
            dataPath,
            logIdent: `${this.opts.port}::LIST`
        });

        return this.list.load(neighbors.filter((n) => {
            const tokens = n.split('/');
            return !this.isMyself(tokens[0], tokens[1]);
        }));
    }

    /**
     * Sets and returns an IRI instance
     * @returns {Promise.<IRI>}
     * @private
     */
    _getIRI () {
        const { IRIPort } = this.opts;

        return (new IRI({ logIdent: `${this.opts.port}::IRI`, port: IRIPort })).start().then((iri) => {
            this.iri = iri;
            return iri;
        })
    }

    /**
     * Tries to get the public IPs of this node.
     * @private
     * @returns {Promise}
     */
    _setPublicIP () {
        if (this.opts.localNodes) {
            return Promise.resolve(0);
        }
        return new Promise((resolve) => {
            const setv6 = () => pip.v6().then((ip) => {
                this.ipv6 = ip;
                resolve(0);
            }).catch(resolve(0));

            pip.v4().then((ip) => {
                this.ipv4 = ip;
                return setv6();
            }).catch(setv6);
        })
    }

    /**
     * Creates HTTP server for Nelson
     * @private
     */
    _createServer () {
        this.server = new WebSocket.Server({ port: this.opts.port, verifyClient: (info, cb) => {
            const { req } = info;
            const { remoteAddress: address } = req.connection;
            const headers = this._getHeaderIdentifiers(req.headers);
            const { port, nelsonID } = headers || {};
            const wrongRequest = !headers;

            const deny = () => {
                cb(false, 401);
            };
            const accept = () => cb(true);

            if (wrongRequest || this.isMyself(address, port, nelsonID)) {
                this.log('!!', 'Wrong request or myself', address, port, nelsonID, req.headers);
                return deny();
            }

            const maxSlots = this.opts.isMaster
                ? this.opts.incomingMax + this.opts.outgoingMax
                : this.opts.incomingMax;
            if (this._getIncomingSlotsCount() >= maxSlots) {
                return deny();
            }

            this.isAllowed(address, port).then((allowed) => allowed? accept() : deny());
        } });

        this.server.on('connection', (ws, req) => {
            this.log('incoming connection established', req.connection.remoteAddress);
            const { remoteAddress: address } = req.connection;
            const { port, TCPPort, UDPPort } = this._getHeaderIdentifiers(req.headers);

            this.list.add(address, port, TCPPort, UDPPort).then((peer) => {
                this._bindWebSocket(ws, peer, true);
            }).catch((e) => {
                this.log('Error binding/adding', address, port, e);
                this.sockets.delete(Array.from(this.sockets.keys()).find(p => this.sockets.get(p) === ws));
                ws.close();
                ws.terminate();
            });
        });

        this.server.on('headers', (headers) => {
            const myHeaders = this._getHeaders();
            Object.keys(myHeaders).forEach((key) => headers.push(`${key}: ${myHeaders[key]}`));
        });
        this.log('server created...');
    }

    /**
     * Binds the websocket to the peer and adds callbacks.
     * @param {WebSocket} ws
     * @param {Peer} peer
     * @param {boolean} asServer
     * @private
     */
    _bindWebSocket (ws, peer, asServer=false) {
        const removeNeighbor = (e) => {
            this.log('closing connection', e);
            this._removeNeighbor(peer);
        };

        const onConnected = () => {
            this.log('connection established', peer.data.hostname, peer.data.port);
            this._sendNeighbors(ws);
            this.list.markConnected(peer, !asServer)
                .then(this.iri.addNeighbors([ peer ]))
                .then(this.opts.onPeerConnected);
        };

        let promise = null;
        ws.isAlive = true;
        this.sockets.set(peer, ws);

        asServer && onConnected();
        ws.incoming = asServer;

        ws.on('headers', (headers) => {
            // Check for valid headers
            const head = this._getHeaderIdentifiers(headers);
            if (!head) {
                this.log('!!', 'wrong headers received', head);
                return removeNeighbor();
            }
            const { port, nelsonID, TCPPort, UDPPort } = head;
            this.list.update(peer, { port, nelsonID, TCPPort, UDPPort }).then((peer) => {
                promise = Promise.resolve(peer);
            })
        });
        ws.on('message',
            (data) => this._addNeighbors(data, ws.incoming ? 0 : peer.data.weight * this.opts.weightDeflation)
        );
        ws.on('open', onConnected);
        ws.on('close', removeNeighbor);
        ws.on('error', removeNeighbor);
        ws.on('pong', () => { ws.isAlive = true });
    }

    /**
     * Parses the headers passed between nelson instances
     * @param {object} headers
     * @returns {object}
     * @private
     */
    _getHeaderIdentifiers (headers) {
        const port = headers['nelson-port'];
        const nelsonID = headers['nelson-id'];
        const TCPPort = headers['nelson-tcp'];
        const UDPPort = headers['nelson-udp'];
        if (!port || ! nelsonID || !TCPPort || !UDPPort) {
            return null;
        }
        return { port, nelsonID, TCPPort, UDPPort };
    }

    /**
     * Sends list of neighbors through the given socket.
     * @param {WebSocket} ws
     * @private
     */
    _sendNeighbors (ws) {
        ws.send(JSON.stringify(this.getPeers().map((p) => p.getHostname())))
    }

    /**
     * Adds a neighbor to known neighbors list.
     * @param {string} neighbor
     * @param {number} weight of the neighbor to assign
     * @returns {Promise}
     * @private
     */
    _addNeighbor (neighbor, weight) {
        // this.log('adding neighbor', neighbor);
        const tokens = neighbor.split('/');
        if (!isFinite(tokens[1]) || !isFinite(tokens[2]) || !isFinite(tokens[3])) {
            return Promise.resolve(null);
        }
        return this.isMyself(tokens[0], tokens[1])
            ? Promise.resolve(null)
            : this.list.add(tokens[0], tokens[1], tokens[2], tokens[3], false, weight);
    }

    /**
     * Parses raw data from peer's response and adds the provided neighbors.
     * @param {string} data raw from peer's response
     * @param {number} weight to assign to the parsed neighbors.
     * @returns {Promise}
     * @private
     */
    _addNeighbors (data, weight) {
        this.log('add neighbors', data);
        return new Promise((resolve, reject) => {
            try {
                Promise.all(JSON.parse(data).slice(0, this.opts.maxShareableNodes).map(
                    (neighbor) => this._addNeighbor(neighbor, weight)
                )).then(resolve)
            } catch (e) {
                reject(e);
            }
        })
    }

    /**
     * Returns Nelson headers for request/response purposes
     * @returns {Object}
     * @private
     */
    _getHeaders () {
        return {
            'Content-Type': 'application/json',
            'Nelson-Port': `${this.opts.port}`,
            'Nelson-ID': this.heart.personality.publicId,
            'Nelson-TCP': this.opts.TCPPort,
            'Nelson-UDP': this.opts.UDPPort
        }
    }

    /**
     * Returns amount of incoming connections
     * @returns {Number}
     * @private
     */
    _getIncomingSlotsCount () {
        const arr = Array.from(this.sockets.values()).filter(ws => ws.readyState < 2);
        return arr.filter(ws => ws.incoming).length
    }

    /**
     * Returns amount of outgoing connections
     * @returns {Number}
     * @private
     */
    _getOutgoingSlotsCount () {
        const arr = Array.from(this.sockets.values()).filter(ws => ws.readyState < 2);
        return arr.filter(ws => !ws.incoming).length
    }

    /**
     * Disconnects a peer.
     * @param {Peer} peer
     * @returns {Promise<Peer>}
     * @private
     */
    _removeNeighbor (peer) {
        this.log('removing neighbor', peer.data.hostname, peer.data.port);
        return this._removeNeighbors([ peer ]);
    }

    /**
     * Disconnects several peers.
     * @param {Peer[]} peers
     * @returns {Promise<Peer[]>}
     * @private
     */
    _removeNeighbors (peers) {
        this.log('removing neighbors');

        const doRemove = () => {
            peers.forEach((peer) => {
                const ws = this.sockets.get(peer);
                if (ws) {
                    ws.close();
                    ws.terminate();
                }
                this.sockets.delete(peer);
                this.opts.onPeerRemoved(peer);
            });
            return peers;
        };

        return this.iri.removeNeighbors(peers).then(doRemove).catch(doRemove);
    }

    /**
     * Randomly removes a given amount of peers from current connections.
     * @param {number} amount
     * @returns {Promise.<Peer[]>} removed peers
     * @private
     */
    _dropRandomNeighbors (amount=1) {
        const peers = Array.from(this.sockets.keys());
        const selectRandomPeer = () => peers.splice(getRandomInt(0, peers.length), 1)[0];
        const toRemove = [];
        for (let x = 0; x < amount; x++) {
            toRemove.push(selectRandomPeer());
        }
        return this._removeNeighbors(toRemove);
    }

    /**
     * Connects to a peer, checking if it's online and trying to get its peers.
     * @param {Peer} peer
     * @returns {Peer}
     */
    connectPeer (peer) {
        this.log('connecting peer', peer.data.hostname, peer.data.port);
        this._bindWebSocket(new WebSocket(`ws://${peer.data.hostname}:${peer.data.port}`, {
            headers: this._getHeaders(),
            handshakeTimeout: 10000
        }), peer);
        return peer;
    }

    /**
     * Connects the node to a new set of random addresses that comply with the out/in rules.
     * Up to a soft maximum.
     * @returns {Peer[]} List of new connected peers
     */
    reconnectPeers () {
        // TODO: remove old peers by inverse weight, maybe?
        // this.log('reconnectPeers');
        // If max was reached, do nothing.
        const toTry = Math.ceil((this.opts.outgoingMax - this._getOutgoingSlotsCount())  * 1.5);

        if ( toTry < 1 || this.isMaster || this._getOutgoingSlotsCount() >= this.opts.outgoingMax) {
            return [];
        }

        // Get allowed peers:
        return this.list.getWeighted(192)
            .filter((p) => !this.sockets.get(p))
            .slice(0, toTry)
            .map(this.connectPeer);
    }

    /**
     * Returns a set of peers ready to be shared. Only those that comply with certain identity rules.
     * @returns {Peer[]}
     */
    getPeers () {
        return this.list.getWeighted(this.opts.maxShareableNodes);
    }

    /**
     * Each epoch, disconnect all peers and reconnect new ones.
     * @private
     */
    _onEpoch () {
        this.log('new epoch and new id:', this.heart.personality.id);
        return this._dropRandomNeighbors(getRandomInt(0, this._getOutgoingSlotsCount()))
            .then(() => {
                this.reconnectPeers();
                return false;
            })
    }

    /**
     * Each cycle, disconnect all peers and reconnect new ones.
     * @private
     */
    _onCycle () {
        this.log('new cycle');
        const promises = [];
        // Remove closed or dead sockets. Otherwise set as not alive and ping:
        this.sockets.forEach((ws, peer) => {
            if (ws.readyState > 1 || !ws.isAlive) {
                promises.push(this._removeNeighbor(peer));
            }
            else {
                ws.isAlive = false;
                ws.ping('', false, true);
            }
        });
        return Promise.all(promises).then(() => false);
    }

    /**
     * Checks whether expired peers are still connectable (through re-cycle).
     * If not, disconnect/remove them, too.
     * @returns {Promise}
     * @private
     */
    _onTick () {
        // Try connecting more peers
        return this._getOutgoingSlotsCount() < this.opts.outgoingMax
            ? new Promise((resolve) => {
                this.reconnectPeers();
                resolve(false);
            })
            : Promise.resolve(false);
    }

    /**
     * Returns whether the provided address/port/id matches this node
     * @param {string} address
     * @param {number|string} port
     * @param {string|null} nelsonID
     * @returns {boolean}
     */
    isMyself (address, port, nelsonID=null) {
        const isPrivate = ip.isPrivate(address) || [ '127.0.0.1', 'localhost' ].includes(address);
        const sameAddress = isPrivate || address === this.ipv4 || address === this.ipv6;
        const samePort = parseInt(port) === this.opts.port;
        const sameID = this.heart && this.heart.personality && nelsonID === this.heart.personality.publicId;
        return sameID || (sameAddress && (!this.opts.localNodes || samePort));
    }

    /**
     * Returns whether certain address can contact this instance.
     * @param {string} address
     * @param {number} port
     * @param {boolean} checkTrust - whether to check for trusted peer
     * @param {number} easiness - how "easy" it is to get in
     * @returns {Promise<boolean>}
     */
    isAllowed (address, port, checkTrust=true, easiness=8) {
        const allowed = () => getPeerIdentifier(`${this.heart.personality.id}:${this.opts.localNodes ? port : address}`)
                .slice(0, this._getMinEasiness(easiness))
                .indexOf(this.heart.personality.feature) >= 0;

        return checkTrust
            ? this.list.findByAddress(address, port).then((ps) => ps.filter((p) => p.isTrusted()).length || allowed())
            : Promise.resolve(allowed());

    }

    /**
     * For new nodes, make it easy to find nodes and contact them
     * @param {number} easiness - how easy it is to get in/out
     * @param {number} minConnections - expected approx. connections from incoming or to outgoing peers
     * @returns {number} updated easiness value
     * @private
     */
    _getMinEasiness (easiness, minConnections = 2) {
        const l = this._getIncomingSlotsCount();
        const f = minConnections * 16.0 / easiness;
        if (!l) {
            return 16;
        }
        return l >= f ? easiness : Math.ceil(easiness * (f/l))
    }
}

module.exports = {
    DEFAULT_OPTIONS,
    Node
};
