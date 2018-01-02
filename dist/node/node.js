'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WebSocket = require('ws');
var ip = require('ip');
var pip = require('external-ip')();
var weighted = require('weighted');
var terminal = require('./tools/terminal');

var _require = require('./base'),
    Base = _require.Base;

var _require2 = require('./heart'),
    Heart = _require2.Heart;

var _require3 = require('./guard'),
    Guard = _require3.Guard;

var _require4 = require('./iri'),
    IRI = _require4.IRI,
    DEFAULT_IRI_OPTIONS = _require4.DEFAULT_OPTIONS;

var _require5 = require('./peer-list'),
    PeerList = _require5.PeerList,
    DEFAULT_LIST_OPTIONS = _require5.DEFAULT_OPTIONS;

var _require6 = require('./tools/utils'),
    getPeerIdentifier = _require6.getPeerIdentifier,
    getRandomInt = _require6.getRandomInt,
    getSecondsPassed = _require6.getSecondsPassed,
    getVersion = _require6.getVersion,
    isSameMajorVersion = _require6.isSameMajorVersion,
    getIP = _require6.getIP,
    createIdentifier = _require6.createIdentifier;

var DEFAULT_OPTIONS = {
    name: 'CarrIOTA Nelson',
    cycleInterval: 60,
    epochInterval: 1200,
    beatInterval: 10,
    dataPath: DEFAULT_LIST_OPTIONS.dataPath,
    port: 16600,
    apiPort: 18600,
    apiHostname: '127.0.0.1',
    IRIHostname: DEFAULT_IRI_OPTIONS.hostname,
    IRIPort: DEFAULT_IRI_OPTIONS.port,
    IRIProtocol: DEFAULT_IRI_OPTIONS.protocol,
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
    onReady: function onReady(node) {},
    onPeerConnected: function onPeerConnected(peer) {},
    onPeerRemoved: function onPeerRemoved(peer) {}
};

// TODO: add node tests. Need to mock away IRI for this.

var Node = function (_Base) {
    _inherits(Node, _Base);

    function Node(options) {
        _classCallCheck(this, Node);

        var _this = _possibleConstructorReturn(this, (Node.__proto__ || Object.getPrototypeOf(Node)).call(this, _extends({}, DEFAULT_OPTIONS, options)));

        _this.opts.logIdent = _this.opts.port + '::NODE';

        _this._onCycle = _this._onCycle.bind(_this);
        _this._onEpoch = _this._onEpoch.bind(_this);
        _this._onTick = _this._onTick.bind(_this);
        _this._onIRIHealth = _this._onIRIHealth.bind(_this);
        _this._removeNeighbor = _this._removeNeighbor.bind(_this);
        _this._removeNeighbors = _this._removeNeighbors.bind(_this);
        _this._addNeighbor = _this._addNeighbor.bind(_this);
        _this._addNeighbors = _this._addNeighbors.bind(_this);
        _this.connectPeer = _this.connectPeer.bind(_this);
        _this.reconnectPeers = _this.reconnectPeers.bind(_this);
        _this.end = _this.end.bind(_this);

        _this._ready = false;
        _this.sockets = new Map();

        _this.opts.autoStart && _this.start();
        return _this;
    }

    /**
     * Starts the node server, getting public IP, IRI interface, Peer List and Heart.
     */


    _createClass(Node, [{
        key: 'start',
        value: function start() {
            var _this2 = this;

            var _opts = this.opts,
                cycleInterval = _opts.cycleInterval,
                epochInterval = _opts.epochInterval,
                beatInterval = _opts.beatInterval,
                silent = _opts.silent,
                localNodes = _opts.localNodes;

            this.guard = new Guard({ beatInterval: beatInterval, silent: silent, localNodes: localNodes });

            return this._setPublicIP().then(function () {
                return _this2._getIRI().then(function (iri) {
                    if (!iri) {
                        throw new Error('IRI could not be started');
                    }

                    if (!iri.staticNeighbors.length && _this2.opts.outgoingMax < DEFAULT_OPTIONS.outgoingMax) {
                        _this2.log('WARNING: you have no static neighbors and outboundMax (' + _this2.opts.outgoingMax + ') is set below the advised limit (' + DEFAULT_OPTIONS.outgoingMax + ')!');
                    }

                    if (_this2.opts.incomingMax < DEFAULT_OPTIONS.incomingMax) {
                        _this2.log('WARNING: incomingMax (' + _this2.opts.incomingMax + ') is set below the advised limit (' + DEFAULT_OPTIONS.incomingMax + ')!');
                    }

                    if (_this2.opts.incomingMax <= DEFAULT_OPTIONS.outgoingMax) {
                        _this2.log('WARNING: incomingMax (' + _this2.opts.incomingMax + ') is set below outgoingMax (' + DEFAULT_OPTIONS.outgoingMax + ')!');
                    }

                    return _this2._getList().then(function () {

                        _this2._createServer();

                        _this2.heart = new Heart({
                            silent: silent,
                            cycleInterval: cycleInterval,
                            epochInterval: epochInterval,
                            beatInterval: beatInterval,
                            logIdent: _this2.opts.port + '::HEART',
                            onCycle: _this2._onCycle,
                            onTick: _this2._onTick,
                            onEpoch: _this2._onEpoch
                        });

                        _this2._ready = true;
                        _this2.opts.onReady(_this2);
                        _this2.heart.start();

                        return _this2;
                    }).catch(function (err) {
                        throw err;
                    });
                }).catch(function (err) {
                    throw err;
                });
            });
        }

        /**
         * Ends the node, closing HTTP server and IRI backend.
         * @returns {Promise.<boolean>}
         */

    }, {
        key: 'end',
        value: function end() {
            var _this3 = this;

            this.log('terminating...');

            this.heart && this.heart.end();

            var closeServer = function closeServer() {
                return new Promise(function (resolve) {
                    if (_this3.server) {
                        _this3.server.close();
                    }
                    return _this3.iri.removeAllNeighbors().then(function () {
                        _this3.sockets = new Map();
                        resolve(true);
                    });
                });
            };

            return closeServer().then(function () {
                _this3._ready = false;
                return _this3.iri ? _this3.iri.end() : true;
            });
        }

        /**
         * Sets a new peer list and returns a list of loaded peers.
         * @returns {Promise.<Peer[]>}
         * @private
         */

    }, {
        key: '_getList',
        value: function _getList() {
            var _this4 = this;

            var _opts2 = this.opts,
                localNodes = _opts2.localNodes,
                temporary = _opts2.temporary,
                silent = _opts2.silent,
                neighbors = _opts2.neighbors,
                dataPath = _opts2.dataPath,
                isMaster = _opts2.isMaster,
                lazyLimit = _opts2.lazyLimit,
                lazyTimesLimit = _opts2.lazyTimesLimit;

            this.list = new PeerList({
                multiPort: localNodes,
                temporary: temporary,
                silent: silent,
                dataPath: dataPath,
                isMaster: isMaster,
                lazyLimit: lazyLimit,
                lazyTimesLimit: lazyTimesLimit,
                logIdent: this.opts.port + '::LIST'
            });

            return this.list.load(neighbors.filter(function (n) {
                var tokens = n.split('/');
                return !_this4.isMyself(tokens[0], tokens[1]);
            }));
        }

        /**
         * Sets and returns an IRI instance
         * @returns {Promise.<IRI>}
         * @private
         */

    }, {
        key: '_getIRI',
        value: function _getIRI() {
            var _this5 = this;

            var _opts3 = this.opts,
                IRIHostname = _opts3.IRIHostname,
                IRIPort = _opts3.IRIPort,
                IRIProtocol = _opts3.IRIProtocol,
                silent = _opts3.silent;


            return new IRI({
                logIdent: this.opts.port + '::IRI',
                hostname: IRIHostname,
                port: IRIPort,
                protocol: IRIProtocol,
                onHealthCheck: this._onIRIHealth,
                silent: silent
            }).start().then(function (iri) {
                _this5.iri = iri;
                return iri;
            });
        }

        /**
         * Tries to get the public IPs of this node.
         * @private
         * @returns {Promise}
         */

    }, {
        key: '_setPublicIP',
        value: function _setPublicIP() {
            var _this6 = this;

            if (this.opts.localNodes) {
                return Promise.resolve(0);
            }
            return new Promise(function (resolve) {
                pip(function (err, ip) {
                    if (!err) {
                        _this6.ipv4 = ip;
                        resolve(0);
                    }
                });
            });
        }

        /**
         * Creates HTTP server for Nelson
         * @private
         */

    }, {
        key: '_createServer',
        value: function _createServer() {
            var _this7 = this;

            this.server = new WebSocket.Server({ port: this.opts.port, verifyClient: function verifyClient(info, cb) {
                    var req = info.req;

                    var deny = function deny() {
                        return cb(false, 401);
                    };
                    var accept = function accept() {
                        return cb(true);
                    };
                    _this7._canConnect(req).then(accept).catch(deny);
                } });

            this.server.on('connection', function (ws, req) {
                _this7.log('incoming connection established'.green, req.connection.remoteAddress);
                var address = req.connection.remoteAddress;

                var _getHeaderIdentifiers2 = _this7._getHeaderIdentifiers(req.headers),
                    port = _getHeaderIdentifiers2.port,
                    TCPPort = _getHeaderIdentifiers2.TCPPort,
                    UDPPort = _getHeaderIdentifiers2.UDPPort,
                    remoteKey = _getHeaderIdentifiers2.remoteKey,
                    name = _getHeaderIdentifiers2.name;

                _this7.list.add({
                    hostname: address,
                    port: port,
                    TCPPort: TCPPort,
                    UDPPort: UDPPort,
                    remoteKey: remoteKey,
                    name: name
                }).then(function (peer) {
                    _this7._bindWebSocket(ws, peer, true);
                }).catch(function (e) {
                    _this7.log('Error binding/adding'.red, address, port, e);
                    _this7.sockets.delete(Array.from(_this7.sockets.keys()).find(function (p) {
                        return _this7.sockets.get(p) === ws;
                    }));
                    ws.close();
                    ws.terminate();
                });
            });

            this.server.on('headers', function (headers) {
                var myHeaders = _this7._getHeaders();
                Object.keys(myHeaders).forEach(function (key) {
                    return headers.push(key + ': ' + myHeaders[key]);
                });
            });
            this.log('server created...');
        }

        /**
         * Resolves promise if the client is allowed to connect, otherwise rejection.
         * @param {object} req
         * @returns {Promise}
         * @private
         */

    }, {
        key: '_canConnect',
        value: function _canConnect(req) {
            var _this8 = this;

            var address = req.connection.remoteAddress;

            var headers = this._getHeaderIdentifiers(req.headers);

            var _ref = headers || {},
                port = _ref.port,
                nelsonID = _ref.nelsonID,
                version = _ref.version,
                remoteKey = _ref.remoteKey;

            var wrongRequest = !headers;

            return new Promise(function (resolve, reject) {
                if (!_this8.guard || !_this8.guard.isAllowed(address, port)) {
                    return reject();
                }

                if (wrongRequest || !isSameMajorVersion(version)) {
                    _this8.log('Wrong request or other Nelson version', address, port, version, nelsonID, req.headers);
                    return reject();
                }
                if (!_this8.iri || !_this8.iri.isHealthy) {
                    _this8.log('IRI down, denying connections meanwhile', address, port, nelsonID);
                    return reject();
                }
                if (_this8.isMyself(address, port, nelsonID)) {
                    return reject();
                }
                _this8.list.findByRemoteKeyOrAddress(remoteKey, address, port).then(function (peers) {

                    if (peers.length && _this8.sockets.get(peers[0])) {
                        _this8.log('Peer already connected', address, port);
                        return reject();
                    }

                    if (peers.length && _this8.iri.isStaticNeighbor(peers[0])) {
                        _this8.log('Peer is already a static neighbor', address, port);
                        return reject();
                    }

                    // Deny too frequent connections from the same peer.
                    if (peers.length && _this8.isSaturationReached() && peers[0].data.dateLastConnected && getSecondsPassed(peers[0].data.dateLastConnected) < _this8.opts.epochInterval * 2) {
                        return reject();
                    }

                    var topCount = parseInt(Math.sqrt(_this8.list.all().length) * 2);
                    var topPeers = _this8.list.getWeighted(300).sort(function (a, b) {
                        return b[1] - a[1];
                    }).map(function (p) {
                        return p[0];
                    }).slice(0, topCount);
                    var isTop = false;

                    peers.forEach(function (p) {
                        if (topPeers.includes(p)) {
                            isTop = true;
                        }
                    });

                    // The usual way, accept based on personality.
                    var normalPath = function normalPath() {
                        if (_this8._getIncomingSlotsCount() >= _this8.opts.incomingMax) {
                            reject();
                        }

                        // TODO: additional protection measure: make the client solve a computational riddle!

                        _this8.isAllowed(remoteKey, address, port).then(function (allowed) {
                            return allowed ? resolve() : reject();
                        });
                    };

                    // Accept old, established nodes.
                    if (isTop) {
                        if (_this8._getIncomingSlotsCount() >= _this8.opts.incomingMax) {
                            _this8._dropRandomNeighbors(1, true).then(resolve);
                        } else {
                            resolve();
                        }
                    }
                    // Accept new nodes more easily.
                    else if (!peers.length || getSecondsPassed(peers[0].data.dateCreated) <= _this8.opts.epochInterval * 10) {
                            if (_this8._getIncomingSlotsCount() >= _this8.opts.incomingMax) {
                                var candidates = Array.from(_this8.sockets.keys()).filter(function (p) {
                                    return getSecondsPassed(p.data.dateCreated) <= _this8.opts.epochInterval * 20;
                                });
                                if (candidates.length) {
                                    _this8._dropRandomNeighbors(1, true, candidates).then(resolve);
                                } else {
                                    normalPath();
                                }
                            } else {
                                resolve();
                            }
                        } else {
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

    }, {
        key: '_bindWebSocket',
        value: function _bindWebSocket(ws, peer) {
            var _this9 = this;

            var asServer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

            var removeNeighbor = function removeNeighbor(e) {
                if (!ws || ws.removingNow) {
                    return;
                }
                ws.removingNow = true;
                _this9._removeNeighbor(peer).then(function () {
                    _this9.log('connection closed'.red, _this9.formatNode(peer.data.hostname, peer.data.port), '(' + e + ')');
                });
            };

            var onConnected = function onConnected() {
                _this9.log('connection established'.green, _this9.formatNode(peer.data.hostname, peer.data.port));
                _this9._sendNeighbors(ws);
                peer.markConnected().then(function () {
                    return _this9.iri.addNeighbors([peer]);
                }).then(function () {
                    return _this9.opts.onPeerConnected(peer);
                });
            };

            ws.isAlive = true;
            ws.incoming = asServer;
            this.sockets.set(peer, ws);

            if (asServer) {
                onConnected();
            } else {
                ws.on('headers', function (headers) {
                    // Check for valid headers
                    var head = _this9._getHeaderIdentifiers(headers);
                    if (!head) {
                        _this9.log('!!', 'wrong headers received', head);
                        return removeNeighbor();
                    }
                    var port = head.port,
                        nelsonID = head.nelsonID,
                        TCPPort = head.TCPPort,
                        UDPPort = head.UDPPort,
                        remoteKey = head.remoteKey,
                        name = head.name;

                    _this9.list.update(peer, { port: port, nelsonID: nelsonID, TCPPort: TCPPort, UDPPort: UDPPort, remoteKey: remoteKey, name: name });
                });
                ws.on('open', onConnected);
            }

            ws.on('message', function (data) {
                return _this9._addNeighbors(data, ws.incoming ? 0 : peer.data.weight);
            });
            ws.on('close', function () {
                return removeNeighbor('socket closed');
            });
            ws.on('error', function () {
                return removeNeighbor('remotely dropped');
            });
            ws.on('pong', function () {
                ws.isAlive = true;
            });
        }

        /**
         * Parses the headers passed between nelson instances
         * @param {object} headers
         * @returns {object}
         * @private
         */

    }, {
        key: '_getHeaderIdentifiers',
        value: function _getHeaderIdentifiers(headers) {
            var version = headers['nelson-version'];
            var port = headers['nelson-port'];
            var nelsonID = headers['nelson-id'];
            var TCPPort = headers['nelson-tcp'];
            var UDPPort = headers['nelson-udp'];
            var remoteKey = headers['nelson-key'];
            var name = headers['nelson-name'];
            if (!version || !port || !nelsonID || !TCPPort || !UDPPort) {
                return null;
            }
            return { version: version, port: port, nelsonID: nelsonID, TCPPort: TCPPort, UDPPort: UDPPort, remoteKey: remoteKey, name: name };
        }

        /**
         * Sends list of neighbors through the given socket.
         * @param {WebSocket} ws
         * @private
         */

    }, {
        key: '_sendNeighbors',
        value: function _sendNeighbors(ws) {
            ws.send(JSON.stringify(this.getPeers().map(function (p) {
                return p[0].getHostname() + '/' + p[1];
            })));
        }

        /**
         * Adds a neighbor to known neighbors list.
         * @param {string} neighbor
         * @param {number} weight of the neighbor to assign
         * @returns {Promise}
         * @private
         */

    }, {
        key: '_addNeighbor',
        value: function _addNeighbor(neighbor, weight) {
            // this.log('adding neighbor', neighbor);
            var tokens = neighbor.split('/');
            if (!isFinite(tokens[1]) || !isFinite(tokens[2]) || !isFinite(tokens[3])) {
                return Promise.resolve(null);
            }
            return this.isMyself(tokens[0], tokens[1]) ? Promise.resolve(null) : this.list.add({
                hostname: tokens[0],
                port: tokens[1],
                TCPPort: tokens[2],
                UDPPort: tokens[3],
                peerWeight: weight,
                weight: weight * parseFloat(tokens[4] || 0) * this.opts.weightDeflation
            });
        }

        /**
         * Parses raw data from peer's response and adds the provided neighbors.
         * @param {string} data raw from peer's response
         * @param {number} weight to assign to the parsed neighbors.
         * @returns {Promise}
         * @private
         */

    }, {
        key: '_addNeighbors',
        value: function _addNeighbors(data, weight) {
            var _this10 = this;

            // this.log('add neighbors', data);
            return new Promise(function (resolve, reject) {
                try {
                    Promise.all(JSON.parse(data).slice(0, _this10.opts.maxShareableNodes).map(function (neighbor) {
                        return _this10._addNeighbor(neighbor, weight);
                    })).then(resolve);
                } catch (e) {
                    reject(e);
                }
            });
        }

        /**
         * Returns Nelson headers for request/response purposes
         * @param {string} key of the peer
         * @returns {Object}
         * @private
         */

    }, {
        key: '_getHeaders',
        value: function _getHeaders() {
            var key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

            return {
                'Content-Type': 'application/json',
                'Nelson-Version': getVersion(),
                'Nelson-Port': '' + this.opts.port,
                'Nelson-ID': this.heart.personality.publicId,
                'Nelson-TCP': this.opts.TCPPort,
                'Nelson-UDP': this.opts.UDPPort,
                'Nelson-Key': key,
                'Nelson-Name': this.opts.name
            };
        }

        /**
         * Returns amount of incoming connections
         * @returns {Number}
         * @private
         */

    }, {
        key: '_getIncomingSlotsCount',
        value: function _getIncomingSlotsCount() {
            var arr = Array.from(this.sockets.values()).filter(function (ws) {
                return ws.readyState < 2;
            });
            return arr.filter(function (ws) {
                return ws.incoming;
            }).length;
        }

        /**
         * Returns amount of outgoing connections
         * @returns {Number}
         * @private
         */

    }, {
        key: '_getOutgoingSlotsCount',
        value: function _getOutgoingSlotsCount() {
            var arr = Array.from(this.sockets.values()).filter(function (ws) {
                return ws.readyState < 2;
            });
            return arr.filter(function (ws) {
                return !ws.incoming;
            }).length;
        }

        /**
         * Disconnects a peer.
         * @param {Peer} peer
         * @returns {Promise<Peer>}
         * @private
         */

    }, {
        key: '_removeNeighbor',
        value: function _removeNeighbor(peer) {
            if (!this.sockets.get(peer)) {
                return Promise.resolve([]);
            }
            // this.log('removing neighbor', this.formatNode(peer.data.hostname, peer.data.port));
            return this._removeNeighbors([peer]);
        }

        /**
         * Disconnects several peers.
         * @param {Peer[]} peers
         * @returns {Promise<Peer[]>}
         * @private
         */

    }, {
        key: '_removeNeighbors',
        value: function _removeNeighbors(peers) {
            var _this11 = this;

            // this.log('removing neighbors');

            var doRemove = function doRemove() {
                return Promise.all(peers.map(function (peer) {
                    return new Promise(function (resolve) {
                        var ws = _this11.sockets.get(peer);
                        if (ws) {
                            ws.close();
                            ws.terminate();
                        }
                        _this11.sockets.delete(peer);
                        peer.markDisconnected().then(function () {
                            _this11.opts.onPeerRemoved(peer);
                            resolve(peer);
                        });
                    });
                }));
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

    }, {
        key: '_dropRandomNeighbors',
        value: function _dropRandomNeighbors() {
            var amount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

            var _this12 = this;

            var incomingOnly = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
            var array = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

            var peers = array ? array : incomingOnly ? Array.from(this.sockets.keys()).filter(function (p) {
                return _this12.sockets.get(p).incoming;
            }) : array ? array : Array.from(this.sockets.keys());
            var selectRandomPeer = function selectRandomPeer() {
                var weights = peers.map(function (p) {
                    return Math.max(p.getPeerQuality(), 0.0001);
                });
                return weighted(peers, weights);
            };
            var toRemove = [];

            if (!peers.length) {
                return Promise.resolve([]);
            }

            for (var x = 0; x < amount; x++) {
                var peer = selectRandomPeer();
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

    }, {
        key: 'connectPeer',
        value: function connectPeer(peer) {
            this.log('connecting peer'.yellow, this.formatNode(peer.data.hostname, peer.data.port));
            var key = peer.data.key || createIdentifier();
            this.list.update(peer, { dateTried: new Date(), tried: (peer.data.tried || 0) + 1, key: key });
            this._bindWebSocket(new WebSocket('ws://' + peer.data.hostname + ':' + peer.data.port, {
                headers: this._getHeaders(key),
                handshakeTimeout: 5000
            }), peer);
            return peer;
        }

        /**
         * Connects the node to a new set of random addresses that comply with the out/in rules.
         * Up to a soft maximum.
         * @returns {Peer[]} List of new connected peers
         */

    }, {
        key: 'reconnectPeers',
        value: function reconnectPeers() {
            var _this13 = this;

            // TODO: remove old peers by inverse weight, maybe? Not urgent. Can be added at a later point.
            // this.log('reconnectPeers');
            // If max was reached, do nothing:
            var toTry = this.opts.outgoingMax - this._getOutgoingSlotsCount();

            if (!this.iri || !this.iri.isHealthy || toTry < 1 || this.isMaster || this._getOutgoingSlotsCount() >= this.opts.outgoingMax) {
                return [];
            }

            // Get connectable peers:
            var list = this.list.all().filter(function (p) {
                return !p.data.dateTried || getSecondsPassed(p.data.dateTried) > _this13.opts.beatInterval * Math.max(2, 2 * p.data.tried || 0);
            }).filter(function (p) {
                return !_this13.iri.isStaticNeighbor(p);
            });

            // Get allowed peers:
            return this.list.getWeighted(192, list).filter(function (p) {
                return !_this13.sockets.get(p[0]);
            }).slice(0, toTry).map(function (p) {
                return _this13.connectPeer(p[0]);
            });
        }

        /**
         * Returns a set of peers ready to be shared with their respective weight ratios.
         * @returns {Array[]}
         */

    }, {
        key: 'getPeers',
        value: function getPeers() {
            // The node tries to recommend best of the best, even better nodes than it tries to connect, usually.
            // One tries to be helpful to the others, remember? Only suggesting top-notch peers.
            return this.list.getWeighted(this.opts.maxShareableNodes, null, 2);
        }

        /**
         * Each epoch, disconnect all peers and reconnect new ones.
         * @private
         */

    }, {
        key: '_onEpoch',
        value: function _onEpoch() {
            var _this14 = this;

            this.log('new epoch and new id:', this.heart.personality.id);
            if (!this.isSaturationReached()) {
                return Promise.resolve(false);
            }
            // Master node should recycle all its connections
            if (this.opts.isMaster) {
                return this._removeNeighbors(Array.from(this.sockets.keys())).then(function () {
                    _this14.reconnectPeers();
                    return false;
                });
            }
            return this._dropRandomNeighbors(getRandomInt(0, this._getOutgoingSlotsCount())).then(function () {
                _this14.reconnectPeers();
                return false;
            });
        }

        /**
         * Checks whether expired peers are still connectable.
         * If not, disconnect/remove them.
         * @private
         */

    }, {
        key: '_onCycle',
        value: function _onCycle() {
            var _this15 = this;

            this.log('new cycle');
            var promises = [];
            // Remove closed or dead sockets. Otherwise set as not alive and ping:
            this.sockets.forEach(function (ws, peer) {
                if (ws.readyState > 1 || !ws.isAlive) {
                    promises.push(_this15._removeNeighbor(peer));
                } else if (peer.isLazy()) {
                    _this15.log(('Peer ' + peer.data.hostname + ' (' + peer.data.name + ') is lazy for more than ' + _this15.opts.lazyLimit + ' seconds. Removing...!').yellow);
                    promises.push(_this15._removeNeighbor(peer));
                } else {
                    ws.isAlive = false;
                    ws.ping('', false, true);
                }
            });
            return Promise.all(promises).then(function () {
                return false;
            });
        }

        /**
         * Try connecting to more peers.
         * @returns {Promise}
         * @private
         */

    }, {
        key: '_onTick',
        value: function _onTick() {
            var _this16 = this;

            terminal.nodes({
                nodes: this.list.all(),
                connected: Array.from(this.sockets.keys()).filter(function (p) {
                    return _this16.sockets.get(p).readyState === 1;
                }).map(function (p) {
                    return p.data;
                })
            });

            // Try connecting more peers. Master nodes do not actively connect (no outgoing connections).
            if (!this.opts.isMaster && this._getOutgoingSlotsCount() < this.opts.outgoingMax) {
                return new Promise(function (resolve) {
                    _this16.reconnectPeers();
                    resolve(false);
                });
            }

            // If for some reason the maximal nodes were overstepped, drop one.
            else if (this._getIncomingSlotsCount() > this.opts.incomingMax) {
                    return this._dropRandomNeighbors(this._getIncomingSlotsCount() - this.opts.incomingMax, true).then(function () {
                        return false;
                    });
                } else {
                    return Promise.resolve(false);
                }
        }

        /**
         * Callback for IRI to check for health and neighbors.
         * If unhealthy, disconnect all. Otherwise, disconnect peers that are not in IRI list any more for any reason.
         * @param {boolean} healthy
         * @param {object[]} neighbors
         * @private
         */

    }, {
        key: '_onIRIHealth',
        value: function _onIRIHealth(healthy, data) {
            var _this17 = this;

            if (!healthy) {
                this.log('IRI gone... closing all Nelson connections'.red);
                return this._removeNeighbors(Array.from(this.sockets.keys()));
            }
            return Promise.all(data.map(function (n) {
                return n.address;
            }).map(getIP)).then(function (neighbors) {
                var toRemove = [];
                Array.from(_this17.sockets.keys())
                // It might be that the neighbour was just added and not yet included in IRI...
                .filter(function (p) {
                    return getSecondsPassed(p.data.dateLastConnected) > 5;
                }).forEach(function (peer) {
                    if (!neighbors.includes(peer.data.hostname) && peer.data.ip && !neighbors.includes(peer.data.ip)) {
                        toRemove.push(peer);
                    } else {
                        var index = Math.max(neighbors.indexOf(peer.data.hostname), neighbors.indexOf(peer.data.ip));
                        index >= 0 && peer.updateConnection(data[index]);
                    }
                });
                if (toRemove.length) {
                    _this17.log('Disconnecting Nelson nodes that are missing in IRI:'.red, toRemove.map(function (p) {
                        return p.data.hostname;
                    }));
                    return _this17._removeNeighbors(toRemove);
                }
                return [];
            });
        }

        /**
         * Returns whether the provided address/port/id matches this node
         * @param {string} address
         * @param {number|string} port
         * @param {string|null} nelsonID
         * @returns {boolean}
         */

    }, {
        key: 'isMyself',
        value: function isMyself(address, port) {
            var nelsonID = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

            var isPrivate = ip.isPrivate(address) || ['127.0.0.1', 'localhost'].includes(address);
            var sameAddress = isPrivate || address === this.ipv4;
            var samePort = parseInt(port) === this.opts.port;
            var sameID = this.heart && this.heart.personality && nelsonID === this.heart.personality.publicId;
            return sameID || sameAddress && (!this.opts.localNodes || samePort);
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

    }, {
        key: 'isAllowed',
        value: function isAllowed(remoteKey, address, port) {
            var _this18 = this;

            var checkTrust = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
            var easiness = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 24;

            var allowed = function allowed() {
                return getPeerIdentifier(_this18.heart.personality.id + ':' + (_this18.opts.localNodes ? port : address)).slice(0, _this18._getMinEasiness(easiness)).indexOf(_this18.heart.personality.feature) >= 0;
            };

            return checkTrust ? this.list.findByRemoteKeyOrAddress(remoteKey, address, port).then(function (ps) {
                return ps.filter(function (p) {
                    return p.isTrusted();
                }).length || allowed();
            }) : Promise.resolve(allowed());
        }

        /**
         * Returns whether the amount of connected nodes has reached a certain threshold.
         * @returns {boolean}
         */

    }, {
        key: 'isSaturationReached',
        value: function isSaturationReached() {
            var ratioConnected = (this._getOutgoingSlotsCount() + this._getIncomingSlotsCount()) / (this.opts.outgoingMax + this.opts.incomingMax);
            return ratioConnected >= 0.75;
        }

        /**
         * For new nodes, make it easy to find nodes and contact them
         * @param {number} easiness - how easy it is to get in/out
         * @returns {number} updated easiness value
         * @private
         */

    }, {
        key: '_getMinEasiness',
        value: function _getMinEasiness(easiness) {
            // New nodes are trusting less the incoming connections.
            // As the node matures in the community, it becomes more welcoming for inbound requests.
            var l = this.list.all().filter(function (p) {
                return p.data.connected;
            }).length;
            return Math.min(easiness, Math.max(5, parseInt(l / 2)));
        }
    }]);

    return Node;
}(Base);

module.exports = {
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    Node: Node
};