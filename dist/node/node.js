'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WebSocket = require('ws');
var ip = require('ip');
var pip = require('external-ip')();
var terminal = require('./tools/terminal');

var _require = require('./base'),
    Base = _require.Base;

var _require2 = require('./heart'),
    Heart = _require2.Heart;

var _require3 = require('./iri'),
    IRI = _require3.IRI,
    DEFAULT_IRI_OPTIONS = _require3.DEFAULT_OPTIONS;

var _require4 = require('./peer-list'),
    PeerList = _require4.PeerList,
    DEFAULT_LIST_OPTIONS = _require4.DEFAULT_OPTIONS;

var _require5 = require('./tools/utils'),
    getPeerIdentifier = _require5.getPeerIdentifier,
    getRandomInt = _require5.getRandomInt,
    getSecondsPassed = _require5.getSecondsPassed,
    getVersion = _require5.getVersion,
    isSameMajorVersion = _require5.isSameMajorVersion;

var DEFAULT_OPTIONS = {
    cycleInterval: 60,
    epochInterval: 600,
    beatInterval: 10,
    epochsBetweenWeight: 10,
    dataPath: DEFAULT_LIST_OPTIONS.dataPath,
    port: 16600,
    apiPort: 18600,
    apiHostname: '127.0.0.1',
    IRIHostname: DEFAULT_IRI_OPTIONS.hostname,
    IRIPort: DEFAULT_IRI_OPTIONS.port,
    TCPPort: DEFAULT_IRI_OPTIONS.TCPPort,
    UDPPort: DEFAULT_IRI_OPTIONS.UDPPort,
    weightDeflation: 0.75,
    incomingMax: 7,
    outgoingMax: 5,
    maxShareableNodes: 16,
    localNodes: false,
    isMaster: false,
    temporary: false,
    autoStart: false,
    logIdent: 'NODE',
    neighbors: [],
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

            return this._setPublicIP().then(function () {
                return _this2._getIRI().then(function (iri) {
                    if (!iri) {
                        throw new Error('IRI could not be started');
                    }
                    return _this2._getList().then(function () {
                        var _opts = _this2.opts,
                            cycleInterval = _opts.cycleInterval,
                            epochInterval = _opts.epochInterval,
                            beatInterval = _opts.beatInterval,
                            silent = _opts.silent;


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
                        _this3.sockets = new Map();
                    }
                    resolve(true);
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
                isMaster = _opts2.isMaster;

            this.list = new PeerList({
                multiPort: localNodes,
                temporary: temporary,
                silent: silent,
                dataPath: dataPath,
                isMaster: isMaster,
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
                silent = _opts3.silent;


            return new IRI({
                logIdent: this.opts.port + '::IRI',
                hostname: IRIHostname,
                port: IRIPort,
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
                _this7.log('incoming connection established', req.connection.remoteAddress);
                var address = req.connection.remoteAddress;

                var _getHeaderIdentifiers2 = _this7._getHeaderIdentifiers(req.headers),
                    port = _getHeaderIdentifiers2.port,
                    TCPPort = _getHeaderIdentifiers2.TCPPort,
                    UDPPort = _getHeaderIdentifiers2.UDPPort;

                _this7.list.add(address, port, TCPPort, UDPPort).then(function (peer) {
                    // Prevent multiple connections from the same peer:
                    if (!_this7.sockets.get(peer)) {
                        _this7._bindWebSocket(ws, peer, true);
                    } else {
                        ws.close();
                        ws.terminate();
                    }
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
                version = _ref.version;

            var wrongRequest = !headers;

            return new Promise(function (resolve, reject) {
                if (wrongRequest || !isSameMajorVersion(version) || !_this8.iri.isHealthy || _this8.isMyself(address, port, nelsonID)) {
                    _this8.log('Wrong request or myself', address, port, nelsonID, req.headers);
                    return reject();
                }
                _this8.list.findByAddress(address, port).then(function (peers) {

                    // Deny too frequent connections from the same peer.
                    if (peers.length && _this8.isSaturationReached() && peers[0].data.dateLastConnected && getSecondsPassed(peers[0].data.dateLastConnected) < _this8.opts.epochInterval * 2) {
                        return reject();
                    }

                    var maxSlots = _this8.opts.isMaster ? _this8.opts.incomingMax + _this8.opts.outgoingMax : _this8.opts.incomingMax;
                    var topCount = parseInt(Math.sqrt(_this8.list.all().length) / 2);
                    var topPeers = _this8.list.getWeighted(300).sort(function (a, b) {
                        return a[1] - b[1];
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
                        if (_this8._getIncomingSlotsCount() >= maxSlots) {
                            reject();
                        }

                        // TODO: additional protection measure: make the client solve a computational riddle!

                        _this8.isAllowed(address, port).then(function (allowed) {
                            return allowed ? resolve() : reject();
                        });
                    };

                    // Accept old, established nodes.
                    if (isTop && _this8.list.all().filter(function (p) {
                        return p.data.connected;
                    }).length > topCount) {
                        if (_this8._getIncomingSlotsCount() >= maxSlots) {
                            _this8._dropRandomNeighbors(1).then(resolve);
                        } else {
                            resolve();
                        }
                    }
                    // Accept new nodes more easily.
                    else if (!peers.length || getSecondsPassed(peers[0].data.dateCreated) < _this8.list.getAverageAge() / 2) {
                            if (_this8._getIncomingSlotsCount() >= maxSlots) {
                                var candidates = Array.from(_this8.sockets.keys()).filter(function (p) {
                                    return getSecondsPassed(p.data.dateCreated) < _this8.list.getAverageAge();
                                });
                                if (candidates.length) {
                                    _this8._removeNeighbor(candidates.splice(getRandomInt(0, peers.length), 1)[0]).then(resolve);
                                } else {
                                    normalPath();
                                }
                                _this8._dropRandomNeighbors(1).then(resolve);
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
                _this9._removeNeighbor(peer);
                _this9.log('connection closed'.red, _this9.formatNode(peer.data.hostname, peer.data.port));
            };

            var onConnected = function onConnected() {
                _this9.log('connection established'.green, _this9.formatNode(peer.data.hostname, peer.data.port));
                _this9._sendNeighbors(ws);
                var addWeight = !asServer && getSecondsPassed(peer.data.dateLastConnected) > _this9.opts.epochInterval * _this9.opts.epochsBetweenWeight;
                _this9.list.markConnected(peer, addWeight).then(_this9.iri.addNeighbors([peer])).then(_this9.opts.onPeerConnected);
            };

            var promise = null;
            ws.isAlive = true;
            this.sockets.set(peer, ws);

            if (asServer) {
                ws.incoming = asServer;
                // Prevent spamming nodes from the same locations
                if (this.isSaturationReached() && peer.data.dateLastConnected && getSecondsPassed(peer.data.dateLastConnected) < this.opts.epochInterval * 2) {
                    removeNeighbor();
                    return;
                } else {
                    onConnected();
                }
            }

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
                    UDPPort = head.UDPPort;

                _this9.list.update(peer, { port: port, nelsonID: nelsonID, TCPPort: TCPPort, UDPPort: UDPPort }).then(function (peer) {
                    promise = Promise.resolve(peer);
                });
            });
            ws.on('message', function (data) {
                return _this9._addNeighbors(data, ws.incoming ? 0 : peer.data.weight);
            });
            ws.on('open', onConnected);
            ws.on('close', removeNeighbor);
            ws.on('error', removeNeighbor);
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
            if (!version || !port || !nelsonID || !TCPPort || !UDPPort) {
                return null;
            }
            return { version: version, port: port, nelsonID: nelsonID, TCPPort: TCPPort, UDPPort: UDPPort };
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
            return this.isMyself(tokens[0], tokens[1]) ? Promise.resolve(null) : this.list.add(tokens[0], tokens[1], tokens[2], tokens[3], false, weight * parseFloat(tokens[4] || 0) * this.opts.weightDeflation);
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

            this.log('add neighbors', data);
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
         * @returns {Object}
         * @private
         */

    }, {
        key: '_getHeaders',
        value: function _getHeaders() {
            return {
                'Content-Type': 'application/json',
                'Nelson-Version': getVersion(),
                'Nelson-Port': '' + this.opts.port,
                'Nelson-ID': this.heart.personality.publicId,
                'Nelson-TCP': this.opts.TCPPort,
                'Nelson-UDP': this.opts.UDPPort
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
                peers.forEach(function (peer) {
                    var ws = _this11.sockets.get(peer);
                    if (ws) {
                        ws.close();
                        ws.terminate();
                    }
                    _this11.sockets.delete(peer);
                    _this11.opts.onPeerRemoved(peer);
                });
                return peers;
            };

            if (!this.iri.isHealthy) {
                return Promise.resolve(doRemove());
            }

            return this.iri.removeNeighbors(peers).then(doRemove).catch(doRemove);
        }

        /**
         * Randomly removes a given amount of peers from current connections.
         * @param {number} amount
         * @returns {Promise.<Peer[]>} removed peers
         * @private
         */

    }, {
        key: '_dropRandomNeighbors',
        value: function _dropRandomNeighbors() {
            var amount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

            var peers = Array.from(this.sockets.keys());
            var selectRandomPeer = function selectRandomPeer() {
                return peers.splice(getRandomInt(0, peers.length), 1)[0];
            };
            var toRemove = [];
            for (var x = 0; x < amount; x++) {
                toRemove.push(selectRandomPeer());
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
            this.log('connecting peer', this.formatNode(peer.data.hostname, peer.data.port));
            this.list.update(peer, { dateTried: new Date() });
            this._bindWebSocket(new WebSocket('ws://' + peer.data.hostname + ':' + peer.data.port, {
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

    }, {
        key: 'reconnectPeers',
        value: function reconnectPeers() {
            var _this12 = this;

            // TODO: remove old peers by inverse weight, maybe? Not urgent. Can be added at a later point.
            // this.log('reconnectPeers');
            // If max was reached, do nothing.
            var toTry = this.opts.outgoingMax - this._getOutgoingSlotsCount();

            if (!this.iri.isHealthy || toTry < 1 || this.isMaster || this._getOutgoingSlotsCount() >= this.opts.outgoingMax) {
                return [];
            }

            // Get allowed peers:
            return this.list.getWeighted(192).filter(function (p) {
                return !p[0].data.dateTried || getSecondsPassed(p[0].data.dateTried) > _this12.opts.beatInterval * 2;
            }).filter(function (p) {
                return !_this12.sockets.get(p[0]);
            }).slice(0, toTry).map(function (p) {
                return _this12.connectPeer(p[0]);
            });
        }

        /**
         * Returns a set of peers ready to be shared with their respective weight ratios.
         * @returns {Array[]}
         */

    }, {
        key: 'getPeers',
        value: function getPeers() {
            return this.list.getWeighted(this.opts.maxShareableNodes);
        }

        /**
         * Each epoch, disconnect all peers and reconnect new ones.
         * @private
         */

    }, {
        key: '_onEpoch',
        value: function _onEpoch() {
            var _this13 = this;

            this.log('new epoch and new id:', this.heart.personality.id);
            if (!this.isSaturationReached()) {
                return Promise.resolve(false);
            }
            // Master node should recycle all its connections
            if (this.opts.isMaster) {
                return this._removeNeighbors(Array.from(this.sockets.keys())).then(function () {
                    _this13.reconnectPeers();
                    return false;
                });
            }
            return this._dropRandomNeighbors(getRandomInt(0, this._getOutgoingSlotsCount())).then(function () {
                _this13.reconnectPeers();
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
            var _this14 = this;

            this.log('new cycle');
            var promises = [];
            // Remove closed or dead sockets. Otherwise set as not alive and ping:
            this.sockets.forEach(function (ws, peer) {
                if (ws.readyState > 1 || !ws.isAlive) {
                    promises.push(_this14._removeNeighbor(peer));
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
            var _this15 = this;

            // Try connecting more peers. Master nodes do not actively connect (no outgoing connections).
            terminal.nodes({
                nodes: this.list.all(),
                connected: Array.from(this.sockets.keys()).filter(function (p) {
                    return _this15.sockets.get(p).readyState === 1;
                }).map(function (p) {
                    return p.data;
                })
            });
            return !this.opts.isMaster && this._getOutgoingSlotsCount() < this.opts.outgoingMax ? new Promise(function (resolve) {
                _this15.reconnectPeers();
                resolve(false);
            }) : Promise.resolve(false);
        }

        /**
         * Callback for IRI to check for health and neighbors.
         * If unhealthy, disconnect all. Otherwise, disconnect peers that are not in IRI list any more for any reason.
         * @param {boolean} healthy
         * @param {string[]} neighbors
         * @private
         */

    }, {
        key: '_onIRIHealth',
        value: function _onIRIHealth(healthy, neighbors) {
            if (!healthy) {
                this.log('IRI gone... closing all Nelson connections');
                return this._removeNeighbors(Array.from(this.sockets.keys()));
            }
            var toRemove = [];
            Array.from(this.sockets.keys()).forEach(function (peer) {
                if (!neighbors.includes(peer.getTCPURI()) && !neighbors.includes(peer.getUDPURI())) {
                    // It might be that the neighbour was just added and not yet included in IRI...
                    if (getSecondsPassed(peer.data.dateLastConnected) > 5) {
                        toRemove.push(peer);
                    }
                }
            });
            if (toRemove.length) {
                this.log('Disconnecting Nelson nodes that are missing in IRI', toRemove.map(function (p) {
                    return p.getTCPURI();
                }));
                return this._removeNeighbors(toRemove);
            }
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
         * @param {string} address
         * @param {number} port
         * @param {boolean} checkTrust - whether to check for trusted peer
         * @param {number} easiness - how "easy" it is to get in
         * @returns {Promise<boolean>}
         */

    }, {
        key: 'isAllowed',
        value: function isAllowed(address, port) {
            var _this16 = this;

            var checkTrust = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
            var easiness = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 24;

            var allowed = function allowed() {
                return getPeerIdentifier(_this16.heart.personality.id + ':' + (_this16.opts.localNodes ? port : address)).slice(0, _this16._getMinEasiness(easiness)).indexOf(_this16.heart.personality.feature) >= 0;
            };

            return checkTrust ? this.list.findByAddress(address, port).then(function (ps) {
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
            return ratioConnected >= 0.5;
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