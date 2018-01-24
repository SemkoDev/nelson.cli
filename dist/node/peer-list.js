'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var path = require('path');
var ip = require('ip');
var dns = require('dns');
var tmp = require('tmp');

var _require = require('url'),
    URL = _require.URL;

var weighted = require('weighted');
var Datastore = require('nedb');

var _require2 = require('./base'),
    Base = _require2.Base;

var _require3 = require('./peer'),
    Peer = _require3.Peer;

var _require4 = require('./iri'),
    DEFAULT_IRI_OPTIONS = _require4.DEFAULT_OPTIONS;

var _require5 = require('./tools/utils'),
    getSecondsPassed = _require5.getSecondsPassed,
    createIdentifier = _require5.createIdentifier;

var DEFAULT_OPTIONS = {
    dataPath: path.join(process.cwd(), 'data/neighbors.db'),
    isMaster: false,
    multiPort: false,
    temporary: false,
    logIdent: 'LIST',
    ageNormalizer: 3600,
    lazyLimit: 300, // Time, after which a peer is considered lazy, if no new TXs received
    lazyTimesLimit: 3 // starts to penalize peer's quality if connected so many times without new TXs
};

/**
 * A class that manages a list of peers and its persistence in the database
 * @class PeerList
 */

var PeerList = function (_Base) {
    _inherits(PeerList, _Base);

    function PeerList(options) {
        _classCallCheck(this, PeerList);

        var _this = _possibleConstructorReturn(this, (PeerList.__proto__ || Object.getPrototypeOf(PeerList)).call(this, _extends({}, DEFAULT_OPTIONS, options)));

        _this.onPeerUpdate = _this.onPeerUpdate.bind(_this);
        _this.loaded = false;
        _this.peers = [];

        _this.db = new Datastore({
            filename: _this.opts.temporary ? tmp.tmpNameSync() : _this.opts.dataPath,
            autoload: true
        });
        _this.db.persistence.setAutocompactionInterval(30000);
        return _this;
    }

    /**
     * Loads the peer database, preloading defaults, if any.
     * @param {string[]} defaultPeerURLs
     * @returns {Promise<Peer>}
     */


    _createClass(PeerList, [{
        key: 'load',
        value: function load(defaultPeerURLs) {
            var _this2 = this;

            return new Promise(function (resolve) {
                _this2.db.find({}, function (err, docs) {
                    _this2.peers = docs.map(function (data) {
                        return new Peer(data, _this2._getPeerOptions());
                    });
                    _this2.loadDefaults(defaultPeerURLs).then(function () {
                        _this2.log('DB and default peers loaded');
                        _this2.loaded = true;
                        resolve(_this2.peers);
                    });
                });
            });
        }

        /**
         * Adds default peers to the database/list.
         * @param {string[]} defaultPeerURLs
         * @returns {Promise<Peer>}
         */

    }, {
        key: 'loadDefaults',
        value: function loadDefaults() {
            var _this3 = this;

            var defaultPeerURLs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

            return Promise.all(defaultPeerURLs.map(function (uri) {
                var tokens = uri.split('/');
                return _this3.add({
                    hostname: tokens[0],
                    port: tokens[1],
                    TCPPort: tokens[2],
                    UDPPort: tokens[3],
                    weight: tokens[4] || 1.0,
                    IRIProtocol: tokens[5] || 'udp',
                    isTrusted: true
                });
            }));
        }

        /**
         * Update callback when the peer's data has been changed from within the peer.
         * @param peer
         * @returns {Promise.<Peer>}
         */

    }, {
        key: 'onPeerUpdate',
        value: function onPeerUpdate(peer) {
            var data = _extends({}, peer.data);
            delete data._id;
            return this.update(peer, data, false);
        }

        /**
         * Partially updates a peer with the provided data. Saves into database.
         * @param {Peer} peer
         * @param {Object} data
         * @param {boolean} refreshPeer - whether to update the peers data.
         * @returns {Promise<Peer>}
         */

    }, {
        key: 'update',
        value: function update(peer, data) {
            var _this4 = this;

            var refreshPeer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

            var newData = _extends({}, peer.data, data);
            return new Promise(function (resolve) {
                _this4.db.update({ _id: peer.data._id }, newData, { returnUpdatedDocs: true }, function () {
                    // this.log(`updated peer ${peer.data.hostname}:${peer.data.port}`, JSON.stringify(data));
                    refreshPeer ? peer.update(newData, false).then(function () {
                        return resolve(peer);
                    }) : resolve(peer);
                });
            });
        }

        /**
         * Returns currently loaded peers.
         * @returns {Peer[]}
         */

    }, {
        key: 'all',
        value: function all() {
            return this.peers;
        }

        /**
         * Removes all peers.
         */

    }, {
        key: 'clear',
        value: function clear() {
            var _this5 = this;

            this.log('Clearing all known peers');
            this.peers = [];
            return new Promise(function (resolve) {
                return _this5.db.remove({}, { multi: true }, resolve);
            });
        }

        /**
         * Gets the average age of all known peers
         * @returns {number}
         */

    }, {
        key: 'getAverageAge',
        value: function getAverageAge() {
            return this.peers.map(function (p) {
                return getSecondsPassed(p.data.dateCreated);
            }).reduce(function (s, x) {
                return s + x;
            }, 0) / this.peers.length;
        }

        /**
         * Returns peers, whose remoteKey, hostname or IP equals the address.
         * Port is only considered if multiPort option is true.
         * If the address/port matches, the remoteKey is not considered.
         * @param {string} remoteKey
         * @param {string} address
         * @param {number} port
         * @returns {Promise<Peer[]|null>}
         */

    }, {
        key: 'findByRemoteKeyOrAddress',
        value: function findByRemoteKeyOrAddress(remoteKey, address, port) {
            var _this6 = this;

            return new Promise(function (resolve) {
                _this6.findByAddress(address, port).then(function (peers) {
                    if (peers.length) {
                        return resolve(peers);
                    }
                    resolve(_this6.peers.filter(function (p) {
                        return p.data.remoteKey && p.data.remoteKey === remoteKey;
                    }));
                });
            });
        }

        /**
         * Returns peers, whose hostname or IP equals the address.
         * Port is only considered if mutiPort option is true.
         * @param {string} address
         * @param {number} port
         * @returns {Promise<Peer[]|null>}
         */

    }, {
        key: 'findByAddress',
        value: function findByAddress(address, port) {
            var _this7 = this;

            var addr = PeerList.cleanAddress(address);
            return new Promise(function (resolve) {
                var findWithIP = function findWithIP(ip) {
                    var peers = _this7.peers.filter(function (p) {
                        return p.data.hostname === addr || p.data.hostname === address || ip && (p.data.hostname === ip || p.data.ip === ip);
                    });
                    resolve(_this7.opts.multiPort ? peers.filter(function (p) {
                        return p.data.port == port;
                    }) : peers);
                };

                if (ip.isV6Format(addr) || ip.isV4Format(addr) || _this7.opts.multiPort) {
                    findWithIP(addr);
                } else {
                    dns.resolve(addr, 'A', function (error, results) {
                        return findWithIP(error || !results.length ? null : results[0]);
                    });
                }
            });
        }

        /**
         * Calculates the trust score of a peer
         * @param {Peer} peer
         * @returns {number}
         */

    }, {
        key: 'getPeerTrust',
        value: function getPeerTrust(peer) {
            var age = parseFloat(getSecondsPassed(peer.data.dateCreated)) / this.opts.ageNormalizer;
            if (this.opts.isMaster) {
                var _weightedAge = Math.pow(peer.data.connected || peer.isTrusted() ? age : 0, 2) * Math.pow(peer.getPeerQuality(), 2);
                return Math.max(_weightedAge, 0.0001);
            }
            var weightedAge = Math.pow(age, 2) * Math.pow(peer.getPeerQuality(), 2) * Math.pow(1.0 + peer.data.weight * 10, 2);
            return Math.max(weightedAge, 0.0001);
        }

        /**
         * Get a certain amount of weighted random peers. Return peers with their respective weight ratios
         * The weight depends on relationship age (connections) and trust (weight).
         * @param {number} amount
         * @param {Peer[]} sourcePeers list of peers to use. Optional for filtering purposes.
         * @param {number} power by which increase the weights
         * @returns {Array<Peer, number>}
         */

    }, {
        key: 'getWeighted',
        value: function getWeighted() {
            var amount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

            var _this8 = this;

            var sourcePeers = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
            var power = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1.0;

            amount = amount || this.peers.length;
            var peers = sourcePeers || Array.from(this.peers);
            if (!peers.length) {
                return [];
            }
            var allWeights = peers.map(function (p) {
                return Math.pow(_this8.getPeerTrust(p), power);
            });
            var weightsMax = Math.max.apply(Math, _toConsumableArray(allWeights));

            var choices = [];
            var getChoice = function getChoice() {
                var peer = weighted(peers, allWeights);
                var index = peers.indexOf(peer);
                var weight = allWeights[index];
                peers.splice(index, 1);
                allWeights.splice(index, 1);
                choices.push([peer, weight / weightsMax]);
            };

            for (var x = 0; x < amount; x++) {
                if (peers.length < 1) {
                    break;
                }
                getChoice();
            }
            return choices.filter(function (c) {
                return c && c[0];
            }).map(function (c) {
                return [c[0], c[0].isTrusted() ? 1.0 : c[1]];
            });
        }

        /**
         * Adds a new peer to the list using an URI
         * @param {object} data
         * @returns {*}
         */

    }, {
        key: 'add',
        value: function add(data) {
            var _this9 = this;

            var _Object$assign = Object.assign({
                TCPPort: DEFAULT_IRI_OPTIONS.TCPPort,
                UDPPort: DEFAULT_IRI_OPTIONS.UDPPort,
                IRIProtocol: 'udp',
                isTrusted: false,
                peerWeight: 0.5,
                weight: 0,
                remoteKey: null
            }, data),
                hostname = _Object$assign.hostname,
                rawPort = _Object$assign.port,
                rawTCPPort = _Object$assign.TCPPort,
                rawUDPPort = _Object$assign.UDPPort,
                IRIProtocol = _Object$assign.IRIProtocol,
                isTrusted = _Object$assign.isTrusted,
                peerWeight = _Object$assign.peerWeight,
                weight = _Object$assign.weight,
                remoteKey = _Object$assign.remoteKey,
                name = _Object$assign.name;

            var port = parseInt(rawPort);
            var TCPPort = parseInt(rawTCPPort || DEFAULT_IRI_OPTIONS.TCPPort);
            var UDPPort = parseInt(rawUDPPort || DEFAULT_IRI_OPTIONS.UDPPort);

            return this.findByRemoteKeyOrAddress(remoteKey, hostname, port).then(function (peers) {
                var addr = PeerList.cleanAddress(hostname);
                var existing = peers.length && peers[0];

                if (existing) {
                    return _this9.update(existing, {
                        weight: weight ? existing.data.weight ? weight * peerWeight + existing.data.weight * (1.0 - peerWeight) : weight : existing.data.weight,
                        key: existing.data.key || createIdentifier(),
                        remoteKey: remoteKey || existing.data.remoteKey,
                        name: name || existing.data.name,
                        hostname: addr,
                        port: port, TCPPort: TCPPort, UDPPort: UDPPort, IRIProtocol: IRIProtocol
                    });
                } else {
                    _this9.log('Adding to the list of known Nelson peers: ' + hostname + ':' + port);
                    var peerIP = ip.isV4Format(addr) || ip.isV6Format(addr) ? addr : null;
                    var peer = new Peer({
                        port: port,
                        hostname: addr,
                        ip: peerIP,
                        TCPPort: TCPPort || DEFAULT_IRI_OPTIONS.TCPPort,
                        UDPPort: UDPPort || DEFAULT_IRI_OPTIONS.UDPPort,
                        IRIProtocol: IRIProtocol || 'udp',
                        isTrusted: isTrusted,
                        name: name,
                        weight: weight,
                        remoteKey: remoteKey,
                        key: createIdentifier(),
                        dateCreated: new Date()
                    }, _this9._getPeerOptions());
                    _this9.peers.push(peer);
                    return new Promise(function (resolve, reject) {
                        _this9.db.insert(peer.data, function (err, doc) {
                            if (err) {
                                reject(err);
                            }
                            peer.update(doc);
                            resolve(peer);
                        });
                    });
                }
            });
        }
    }, {
        key: '_getPeerOptions',
        value: function _getPeerOptions() {
            var _opts = this.opts,
                lazyLimit = _opts.lazyLimit,
                lazyTimesLimit = _opts.lazyTimesLimit;

            return { lazyLimit: lazyLimit, lazyTimesLimit: lazyTimesLimit, onDataUpdate: this.onPeerUpdate };
        }

        /**
         * Converts an address to a cleaner format.
         * @param {string} address
         * @returns {string}
         */

    }], [{
        key: 'cleanAddress',
        value: function cleanAddress(address) {
            if (!ip.isV4Format(address) && !ip.isV6Format(address)) {
                return address;
            }
            return ip.isPrivate(address) ? 'localhost' : address.replace('::ffff:', '');
        }
    }]);

    return PeerList;
}(Base);

module.exports = {
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    PeerList: PeerList
};