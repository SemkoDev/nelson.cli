const WebSocket = require('ws');
const ip = require('ip');
const pip = require('external-ip')();
const weighted = require('weighted');
const terminal = require('./tools/terminal');
const { Base } = require('./base');
const { Heart } = require('./heart');
const { Guard } = require('./guard');
const { IRI, DEFAULT_OPTIONS: DEFAULT_IRI_OPTIONS } = require('./iri');
const { PeerList, DEFAULT_OPTIONS: DEFAULT_LIST_OPTIONS } = require('./peer-list');
const {
    getPeerIdentifier, getRandomInt, getSecondsPassed, getVersion, isSameMajorVersion, getIP, createIdentifier
} = require('./tools/utils');

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

const DEFAULT_OPTIONS = {
    name: 'CarrIOTA Nelson',
    cycleInterval: 60,
    epochInterval: 1200,
    beatInterval: 10,
    dataPath: DEFAULT_LIST_OPTIONS.dataPath,
    port: 16600,
    IRIHostname: DEFAULT_IRI_OPTIONS.hostname,
    IRIPort: DEFAULT_IRI_OPTIONS.port,
    IRIProtocol: 'any',
    TCPPort: DEFAULT_IRI_OPTIONS.TCPPort,
    UDPPort: DEFAULT_IRI_OPTIONS.UDPPort,
    weightDeflation: 0.95,
    incomingMax: 6,
    outgoingMax: 5,
    maxShareableNodes: 6,
    localNodes: false,
    isMaster: false,
    temporary: false,
    autoStart: false,
    logIdent: 'NODE',
    neighbors: [],
    lazyLimit: 300, // Time, after which a peer is considered lazy, if no new TXs received
    lazyTimesLimit: 3, // starts to penalize peer's quality if connected so many times without new TXs
    onReady: (node) => {},
    onPeerConnected: (peer) => {},
    onPeerRemoved: (peer) => {}
};

// TODO: add node tests. Need to mock away IRI for this.
class Node extends Base {
    constructor (options) {
        super({ ...DEFAULT_OPTIONS, ...options });
        this.opts.logIdent = `${this.opts.port}::NODE`;

        this._onCycle = this._onCycle.bind(this);
        this._onEpoch = this._onEpoch.bind(this);
        this._onTick = this._onTick.bind(this);
        this._onIRIHealth = this._onIRIHealth.bind(this);
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

        // Tries to fix the issue #45 https://github.com/SemkoDev/nelson.cli/issues/45
        // Reasoning: https://github.com/request/request/issues/2161#issuecomment-313375694
        // Also, cleans up nelson before crashing from the sky.
        process.on('uncaughtException', (err) => {
            if (err.code !== 'ECONNRESET') {
                this.end().then(() => { throw err });
            }
        });
    }

    /**
     * Starts the node server, getting public IP, IRI interface, Peer List and Heart.
     */
    start () {
        const { cycleInterval, epochInterval, beatInterval, silent, localNodes } = this.opts;
        this.guard = new Guard({ beatInterval, silent, localNodes });

        return this._setPublicIP().then(() => {
            return this._getIRI().then((iri) => {
                if (!iri) {
                    throw new Error('IRI could not be started');
                }

                if (!iri.staticNeighbors.length && this.opts.outgoingMax < DEFAULT_OPTIONS.outgoingMax) {
                    this.log(`WARNING: you have no static neighbors and outboundMax (${this.opts.outgoingMax}) is set below the advised limit (${DEFAULT_OPTIONS.outgoingMax})!`);
                }

                if (this.opts.incomingMax < DEFAULT_OPTIONS.incomingMax) {
                    this.log(`WARNING: incomingMax (${this.opts.incomingMax}) is set below the advised limit (${DEFAULT_OPTIONS.incomingMax})!`);
                }

                if (this.opts.incomingMax <= DEFAULT_OPTIONS.outgoingMax) {
                    this.log(`WARNING: incomingMax (${this.opts.incomingMax}) is set below outgoingMax (${DEFAULT_OPTIONS.outgoingMax})!`);
                }

                return this._getList().then(() =>{

                    this._createServer();

                    this.heart = new Heart({
                        silent,
                        cycleInterval,
                        epochInterval,
                        beatInterval,
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
        this._ready = false;

        const closeServer = () => {
            return new Promise((resolve) => {
                if (this.server) {
                    this.server.close();
                }
                return this._removeNeighbors(Array.from(this.sockets.keys())).then(() => {
                    this.sockets = new Map();
                    resolve(true);
                });
            })
        };

        return closeServer().then(() => {
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
        const { localNodes, temporary, silent, neighbors, dataPath, isMaster, lazyLimit, lazyTimesLimit } = this.opts;
        this.list = new PeerList({
            multiPort: localNodes,
            temporary,
            silent,
            dataPath,
            isMaster,
            lazyLimit,
            lazyTimesLimit,
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
        const { IRIHostname, IRIPort, silent } = this.opts;

        return (new IRI({
            logIdent: `${this.opts.port}::IRI`,
            hostname: IRIHostname,
            port: IRIPort,
            onHealthCheck: this._onIRIHealth,
            silent
        })).start().then((iri) => {
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
            pip((err, ip) => {
                if (!err) {
                    this.ipv4 = ip;
                    resolve(0);
                }
            });
        })
    }

    /**
     * Creates HTTP server for Nelson
     * @private
     */
    _createServer () {
        this.server = new WebSocket.Server({ port: this.opts.port, verifyClient: (info, cb) => {
            const { req } = info;
            const deny = () => cb(false, 401);
            const accept = () => cb(true);
            this._canConnect(req).then(accept).catch(deny);
        } });

        this.server.on('connection', (ws, req) => {
            this.log('incoming connection established'.green, req.connection.remoteAddress);
            const { remoteAddress: address } = req.connection;
            const { port, TCPPort, UDPPort, remoteKey, name, protocol } = this._getHeaderIdentifiers(req.headers);
            const IRIProtocol = this._negotiateProtocol(protocol);

            this.list.add({
                hostname: address,
                port,
                TCPPort,
                UDPPort,
                remoteKey,
                name,
                IRIProtocol
            }).then((peer) => {
                this._bindWebSocket(ws, peer, true);
            }).catch((e) => {
                this.log('Error binding/adding'.red, address, port, e);
                this.sockets.delete(Array.from(this.sockets.keys()).find(p => this.sockets.get(p) === ws));
                ws.close();
                ws.terminate();
            });
        });

        this.server.on('headers', (headers) => {
            const myHeaders = this._getHeaders();
            Object.keys(myHeaders).forEach((key) => headers.push(`${key}: ${myHeaders[key]}`));
        });
        this.server.on('error', function (err) {
            // basically, do nothing. Most probably a ECONNRESET error.
            // The peer will be cleaned up on next tick.
        });
        this.log('server created...');
    }

    /**
     * Resolves promise if the client is allowed to connect, otherwise rejection.
     * @param {object} req
     * @returns {Promise}
     * @private
     */
    _canConnect (req) {
        const { remoteAddress: address } = req.connection;
        const headers = this._getHeaderIdentifiers(req.headers);
        const { port, nelsonID, version, remoteKey, protocol } = headers || {};
        const wrongRequest = !headers;

        return new Promise((resolve, reject) => {
            if (!this._ready || !this.guard || !this.guard.isAllowed(address, port)) {
                return reject();
            }

            if (wrongRequest || !isSameMajorVersion(version)) {
                this.log('Wrong request or other Nelson version', address, port, version, nelsonID, req.headers);
                return reject();
            }
            if (!this.iri || !this.iri.isHealthy) {
                this.log('IRI down, denying connections meanwhile', address, port, nelsonID);
                return reject();
            }
            if (this.isMyself(address, port, nelsonID)) {
                return reject();
            }
            this.list.findByRemoteKeyOrAddress(remoteKey, address, port).then((peers) => {

                if (peers.length && this.sockets.get(peers[0])) {
                    this.log('Peer already connected', address, port);
                    return reject();
                }

                if (peers.length && this.iri.isStaticNeighbor(peers[0])) {
                    this.log('Peer is already a static neighbor', address, port);
                    return reject();
                }

                // Deny too frequent connections from the same peer.
                if (peers.length && this.isSaturationReached() && peers[0].data.dateLastConnected && getSecondsPassed(peers[0].data.dateLastConnected) < this.opts.epochInterval * 2) {
                    return reject();
                }

                // Incompatible protocols
                if (peers.length[0] && !this._negotiateProtocol(protocol)) {
                    this.log(`Couldn't negotiate protocol with ${peers[0].data.hostname}: my ${this.opts.IRIProtocol} vs remote ${protocol}`.yellow);
                    return reject();
                }

                const topCount = parseInt(Math.sqrt(this.list.all().length) * 2);
                const topPeers = this.list.getWeighted(300).sort((a, b) => b[1] - a[1]).map(p => p[0])
                    .slice(0, topCount);
                let isTop = false;

                peers.forEach((p) => {
                    if (topPeers.includes(p)) {
                        isTop = true;
                    }
                });

                // The usual way, accept based on personality.
                const normalPath = () => {
                    if (this._getIncomingSlotsCount() >= this.opts.incomingMax) {
                        reject();
                    }

                    // TODO: additional protection measure: make the client solve a computational riddle!

                    this.isAllowed(remoteKey, address, port).then((allowed) => allowed ? resolve() : reject());
                };

                // Accept old, established nodes.
                if (isTop) {
                    if (this._getIncomingSlotsCount() >= this.opts.incomingMax) {
                        this._dropRandomNeighbors(1, true).then(resolve);
                    }
                    else {
                        resolve();
                    }
                }
                // Accept new nodes more easily.
                else if (!peers.length || getSecondsPassed(peers[0].data.dateCreated) <= this.opts.epochInterval * 10) {
                    if (this._getIncomingSlotsCount() >= this.opts.incomingMax) {
                        const candidates = Array.from(this.sockets.keys())
                            .filter(p => getSecondsPassed(p.data.dateCreated) <= this.opts.epochInterval * 20);
                        if (candidates.length) {
                            this._dropRandomNeighbors(1, true, candidates).then(resolve);
                        }
                        else {
                            normalPath();
                        }
                    }
                    else {
                        resolve();
                    }
                }
                else {
                    normalPath();
                }
            });
        });
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
            if (!this._ready || !ws || ws.removingNow) {
                return;
            }
            ws.removingNow = true;
            this._removeNeighbor(peer).then(() => {
                this.log('connection closed'.red, this.formatNode(peer.data.hostname, peer.data.port), `(${e})`);
            });
        };

        const onConnected = () => {
            if (!this._ready) {
                return;
            }
            this.log('connection established'.green, this.formatNode(peer.data.hostname, peer.data.port));
            this._sendNeighbors(ws);
            return this.pingPeer(peer).then(([peer, ping]) => peer.markConnected(ping)).then(() => this._ready && this.opts.onPeerConnected(peer));
        };

        ws.isAlive = true;
        ws.incoming = asServer;
        this.sockets.set(peer, ws);

        ws.on('message',
            (data) => this._addNeighbors(data, ws.incoming ? 0 : peer.data.weight)
        );
        ws.on('close', () => removeNeighbor('socket closed'));
        ws.on('error', () => removeNeighbor('remotely dropped'));
        ws.on('pong', () => { ws.isAlive = true });

        if (asServer) {
            onConnected().then(() => this._ready && this.iri.addNeighbors([ peer ]));
        }
        else {
            ws.on('upgrade', (res) => {
                // Check for valid headers
                const head = this._getHeaderIdentifiers(res.headers);
                if (!head) {
                    this.log('!!', 'wrong headers received', head);
                    return removeNeighbor();
                }
                const { port, nelsonID, TCPPort, UDPPort, remoteKey, name, protocol } = head;
                const IRIProtocol = this._negotiateProtocol(protocol);
                this.list.update(peer, { port, nelsonID, TCPPort, UDPPort, remoteKey, name, IRIProtocol }).then(() => {
                    if (IRIProtocol) {
                        this._ready && this.iri.addNeighbors([ peer ]);
                    } else {
                        this.log(`Couldn't negotiate protocol with ${peer.data.hostname}: my ${this.opts.IRIProtocol} vs remote ${IRIProtocol}`.yellow);
                        removeNeighbor();
                    }
                });
            });
            ws.on('open', onConnected);
        }
    }

    /**
     * Parses the headers passed between nelson instances
     * @param {object} headers
     * @returns {object}
     * @private
     */
    _getHeaderIdentifiers (headers) {
        const version = headers['nelson-version'];
        const port = headers['nelson-port'];
        const nelsonID = headers['nelson-id'];
        const TCPPort = headers['nelson-tcp'];
        const UDPPort = headers['nelson-udp'];
        const remoteKey = headers['nelson-key'];
        const name = headers['nelson-name'];
        const protocol = headers['nelson-protocol'] || 'udp';
        if (!version || !port || ! nelsonID || !TCPPort || !UDPPort) {
            return null;
        }
        return { version, port, nelsonID, TCPPort, UDPPort, remoteKey, name, protocol };
    }

    /**
     * Sends list of neighbors through the given socket.
     * @param {WebSocket} ws
     * @private
     */
    _sendNeighbors (ws) {
        ws.send(JSON.stringify(this.getPeers().map((p) => p[0].getHostname().replace('/0/', `/${p[1]}/`))))
    }

    /**
     * Negotiate protocol to be used between the peers.
     * If null is returned, the connection cannot be established as there is no consensus.
     * @param {string} protocol preferred by remote
     * @param {string} key key for remote
     * @param {string} remoteKey for this node
     * @returns {string|null}
     * @private
     */
    _negotiateProtocol (protocol) {
        if (protocol === 'any') {
            switch (this.opts.IRIProtocol) {
                case 'tcp':
                case 'prefertcp':
                    return 'tcp';
                case 'udp':
                case 'preferudp':
                case 'any':
                default:
                    return 'udp';
            }
        } else if (protocol === 'tcp') {
            switch (this.opts.IRIProtocol) {
                case 'any':
                case 'tcp':
                case 'prefertcp':
                case 'preferudp':
                    return 'tcp';
                case 'udp':
                default:
                    return null;
            }
        } else if (protocol === 'udp') {
            switch (this.opts.IRIProtocol) {
                case 'any':
                case 'udp':
                case 'prefertcp':
                case 'preferudp':
                    return 'udp';
                case 'tcp':
                default:
                    return null;
            }
        } else if (protocol === 'prefertcp') {
            switch (this.opts.IRIProtocol) {
                case 'any':
                case 'tcp':
                case 'prefertcp':
                    return 'tcp';
                case 'preferudp':
                case 'udp':
                default:
                    return 'udp';
            }
        } else if (protocol === 'preferudp') {
            switch (this.opts.IRIProtocol) {
                case 'any':
                case 'udp':
                case 'preferudp':
                case 'prefertcp':
                    return 'udp';
                case 'tcp':
                default:
                    return 'tcp';
            }
        }
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
            : this.list.add({
                hostname: tokens[0],
                port: tokens[1],
                TCPPort: tokens[2],
                UDPPort: tokens[3],
                peerWeight: weight,
                weight:  weight * parseFloat(tokens[4] || 0) * this.opts.weightDeflation,
                IRIProtocol: tokens[5] || 'udp'
            });
    }

    /**
     * Parses raw data from peer's response and adds the provided neighbors.
     * @param {string} data raw from peer's response
     * @param {number} weight to assign to the parsed neighbors.
     * @returns {Promise}
     * @private
     */
    _addNeighbors (data, weight) {
        // this.log('add neighbors', data);
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
     * @param {string} key of the peer
     * @returns {Object}
     * @private
     */
    _getHeaders (key='') {
        return {
            'Content-Type': 'application/json',
            'Nelson-Version': getVersion(),
            'Nelson-Port': `${this.opts.port}`,
            'Nelson-ID': this.heart.personality.publicId,
            'Nelson-TCP': this.opts.TCPPort,
            'Nelson-UDP': this.opts.UDPPort,
            'Nelson-Key': key,
            'Nelson-Name': this.opts.name,
            'Nelson-Protocol': this.opts.IRIProtocol,
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
        if (!this._ready || !this.sockets.get(peer)) {
            return Promise.resolve([]);
        }
        // this.log('removing neighbor', this.formatNode(peer.data.hostname, peer.data.port));
        return this._removeNeighbors([ peer ]);
    }

    /**
     * Disconnects several peers.
     * @param {Peer[]} peers
     * @returns {Promise<Peer[]>}
     * @private
     */
    _removeNeighbors (peers) {
        // this.log('removing neighbors');

        const doRemove = () => {
            return Promise.all(peers.map((peer) => new Promise((resolve) => {
                const ws = this.sockets.get(peer);
                if (ws) {
                    ws.close();
                    ws.terminate();
                }
                this.sockets.delete(peer);
                peer.markDisconnected().then(() => {
                    this.opts.onPeerRemoved(peer);
                    resolve(peer)
                });
            })));
        };

        if (!this.iri || !this.iri.isHealthy) {
            return Promise.resolve(doRemove());
        }

        return this.iri.removeNeighbors(peers).then(doRemove).catch(doRemove);
    }

    /**
     * Randomly removes a given amount of peers from current connections.
     * Low-quality peers are favored to be removed.
     * @param {number} amount
     * @param {boolean} incomingOnly - only drop incoming connections
     * @param {Peer[]} array - array of connected peers to use for dropping
     * @returns {Promise.<Peer[]>} removed peers
     * @private
     */
    _dropRandomNeighbors (amount=1, incomingOnly=false, array=null) {
        const peers = array ? array : incomingOnly
            ? Array.from(this.sockets.keys()).filter(p => this.sockets.get(p).incoming)
            : array ? array : Array.from(this.sockets.keys());
        const selectRandomPeer = () => {
            const weights = peers.map(p => Math.max(p.getPeerQuality(), 0.0001));
            return weighted(peers, weights);
        };
        const toRemove = [];

        if (!peers.length) {
            return Promise.resolve([]);
        }

        for (let x = 0; x < amount; x++) {
            const peer = selectRandomPeer();
            peers.splice(peers.indexOf(peer), 1);
            toRemove.push(peer);
        }

        return this._removeNeighbors(toRemove);
    }

    /**
     * Connects to a peer, checking if it's online and trying to get its peers.
     * @param {Peer} peer
     * @returns {Peer}
     */
    connectPeer (peer) {
        this.log('connecting peer'.yellow, this.formatNode(peer.data.hostname, peer.data.port));
        const key = peer.data.key || createIdentifier();
        this.list.update(peer, { dateTried: new Date(), tried: (peer.data.tried || 0) + 1, key });
        this._bindWebSocket(new WebSocket(peer.getNelsonWebsocketURI(), {
            headers: this._getHeaders(key),
            handshakeTimeout: 5000
        }), peer);
        return peer;
    }

    /**
     * Ping a peer
     * @param {Peer} peer
     * @returns {Promise<Peer, number>}
     */
    pingPeer (peer) {
        return new Promise(resolve => {
            const hrTimeStart = process.hrtime();
            const ws = this.sockets.get(peer);
            const cb = () => {
                const pingInMs = (hrTime => hrTime[0] * 10e2 + hrTime[1] / 10e5)(process.hrtime(hrTimeStart));
                ws.removeListener('pong', cb);
                this.log('Ping for'.green, this.formatNode(peer.data.hostname, peer.data.port), `${pingInMs} ms`.green);
                resolve([peer, pingInMs]);
            };
            ws.on('pong', cb);
            ws.ping('', false);
        });
    }

    /**
     * Connects the node to a new set of random addresses that comply with the out/in rules.
     * Up to a soft maximum.
     * @returns {Peer[]} List of new connected peers
     */
    reconnectPeers () {
        // TODO: remove old peers by inverse weight, maybe? Not urgent. Can be added at a later point.
        // this.log('reconnectPeers');
        // If max was reached, do nothing:
        const toTry = this.opts.outgoingMax - this._getOutgoingSlotsCount();

        if (!this.iri || !this.iri.isHealthy || toTry < 1 || this.isMaster || this._getOutgoingSlotsCount() >= this.opts.outgoingMax) {
            return [];
        }

        // Get connectable peers:
        const list = this.list.all()
            .filter(
                (p) => !p.data.dateTried ||
                    getSecondsPassed(p.data.dateTried) > this.opts.beatInterval * Math.max(2, 2 * p.data.tried || 0)
            )
            .filter((p) => !this.iri.isStaticNeighbor(p));

        // Get allowed peers:
        return this.list.getWeighted(192, list)
            .filter((p) => !this.sockets.get(p[0]))
            .slice(0, toTry)
            .map((p) => this.connectPeer(p[0]));
    }

    /**
     * Returns a set of peers ready to be shared with their respective weight ratios.
     * @returns {Array[]}
     */
    getPeers () {
        // The node tries to recommend best of the best, even better nodes than it tries to connect, usually.
        // One tries to be helpful to the others, remember? Only suggesting top-notch peers.
        return this.list.getWeighted(this.opts.maxShareableNodes, null, 2);
    }

    /**
     * Each epoch, disconnect all peers and reconnect new ones.
     * @private
     */
    _onEpoch () {
        this.log('new epoch and new id:', this.heart.personality.id);
        if (!this.isSaturationReached()) {
            return Promise.resolve(false);
        }
        // Master node should recycle all its connections
        if (this.opts.isMaster) {
            return this._removeNeighbors(Array.from(this.sockets.keys())).then(() => {
                this.reconnectPeers();
                return false;
            });
        }
        return this._dropRandomNeighbors(getRandomInt(0, this._getOutgoingSlotsCount()))
            .then(() => {
                this.reconnectPeers();
                return false;
            })
    }

    /**
     * Checks whether expired peers are still connectable.
     * If not, disconnect/remove them.
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
            else if (peer.isLazy()) {
                this.log(`Peer ${peer.data.hostname} (${peer.data.name}) is lazy for more than ${this.opts.lazyLimit} seconds. Removing...!`.yellow);
                promises.push(this._removeNeighbor(peer));
            }
            else if (ws.readyState === 1) {
                ws.isAlive = false;
                ws.ping('', false);
            }
        });
        return Promise.all(promises).then(() => false);
    }

    /**
     * Try connecting to more peers.
     * @returns {Promise}
     * @private
     */
    _onTick () {
        terminal.nodes({
            nodes: this.list.all(),
            connected: Array.from(this.sockets.keys())
                .filter((p) => this.sockets.get(p).readyState === 1)
                .map((p) => p.data)
        });

        // Try connecting more peers. Master nodes do not actively connect (no outgoing connections).
        if (!this.opts.isMaster && this._getOutgoingSlotsCount() < this.opts.outgoingMax) {
            return new Promise((resolve) => {
                this.reconnectPeers();
                resolve(false);
            })
        }

        // If for some reason the maximal nodes were overstepped, drop one.
        else if (this._getIncomingSlotsCount() > this.opts.incomingMax) {
            return this._dropRandomNeighbors(this._getIncomingSlotsCount() - this.opts.incomingMax, true)
                .then(() => false);
        }
        else {
            return Promise.resolve(false);
        }
    }

    /**
     * Callback for IRI to check for health and neighbors.
     * If unhealthy, disconnect all. Otherwise, disconnect peers that are not in IRI list any more for any reason.
     * @param {boolean} healthy
     * @param {object[]} data
     * @private
     */
    _onIRIHealth (healthy, data) {
        if (!healthy) {
            // Do not drop connections, yet. IRI might just be unavailable for a moment.
            // If it still has "old" neighbors, they will leak, causing more nodes to be added than permitted.
            this.log('IRI gone...'.red);
            return;
            // return this._removeNeighbors(Array.from(this.sockets.keys()));
        }
        Promise.all(data.map(n => n.address).map(getIP)).then((neighbors) => {
            const toRemove = [];
            Array.from(this.sockets.keys())
            // It might be that the neighbour was just added and not yet included in IRI...
                .filter(p => getSecondsPassed(p.data.dateLastConnected) > 5)
                .forEach((peer) => {
                    if (!neighbors.includes(peer.data.hostname) && (!peer.data.ip || peer.data.ip && !neighbors.includes(peer.data.ip))) {
                        toRemove.push(peer);
                    } else {
                        const index = Math.max(neighbors.indexOf(peer.data.hostname), neighbors.indexOf(peer.data.ip));
                        index >= 0 && peer.updateConnection(data[index]);
                    }
                });
            if (toRemove.length) {
                this.log('Disconnecting Nelson nodes that are missing in IRI:'.red, toRemove.map((p) => p.data.hostname));
                return this._removeNeighbors(toRemove);
            }
        }).then(() => this.iri.cleanupNeighbors(Array.from(this.sockets.keys())));
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
        const sameAddress = isPrivate || address === this.ipv4;
        const samePort = parseInt(port) === this.opts.port;
        const sameID = this.heart && this.heart.personality && nelsonID === this.heart.personality.publicId;
        return sameID || (sameAddress && (!this.opts.localNodes || samePort));
    }

    /**
     * Returns whether certain address can contact this instance.
     * @param {string} remoteKey
     * @param {string} address
     * @param {number} port
     * @param {boolean} checkTrust - whether to check for trusted peer
     * @param {number} easiness - how "easy" it is to get in
     * @returns {Promise<boolean>}
     */
    isAllowed (remoteKey, address, port, checkTrust=true, easiness=24) {
        const allowed = () => getPeerIdentifier(`${this.heart.personality.id}:${this.opts.localNodes ? port : address}`)
            .slice(0, this._getMinEasiness(easiness))
            .indexOf(this.heart.personality.feature) >= 0;

        return checkTrust
            ? this.list.findByRemoteKeyOrAddress(remoteKey, address, port)
                .then((ps) => ps.filter((p) => p.isTrusted()).length || allowed())
            : Promise.resolve(allowed());

    }

    /**
     * Returns whether the amount of connected nodes has reached a certain threshold.
     * @returns {boolean}
     */
    isSaturationReached () {
        const ratioConnected = (this._getOutgoingSlotsCount() + this._getIncomingSlotsCount()) /
            (this.opts.outgoingMax + this.opts.incomingMax);
        return ratioConnected >= 0.75
    }

    /**
     * For new nodes, make it easy to find nodes and contact them
     * @param {number} easiness - how easy it is to get in/out
     * @returns {number} updated easiness value
     * @private
     */
    _getMinEasiness (easiness) {
        // New nodes are trusting less the incoming connections.
        // As the node matures in the community, it becomes more welcoming for inbound requests.
        const l = this.list.all().filter(p => p.data.connected).length;
        return Math.min(easiness, Math.max(5, parseInt(l/2)));
    }
}

module.exports = {
    DEFAULT_OPTIONS,
    Node
};
