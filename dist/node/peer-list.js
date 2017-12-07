'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

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

var DEFAULT_OPTIONS = {
    dataPath: path.join(process.cwd(), 'data/neighbors.db'),
    multiPort: false,
    temporary: false,
    logIdent: 'LIST'
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
                        return new Peer(data, { onDataUpdate: _this2.onPeerUpdate });
                    });
                    _this2.loadDefaults(defaultPeerURLs).then(function () {
                        _this2.log('db and default peers loaded');
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
                return _this3.add(tokens[0], tokens[1], tokens[2], tokens[3], true, 1.0);
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
            var data = peer.data;
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
            var updater = function updater() {
                return new Promise(function (resolve) {
                    _this4.db.update({ _id: peer.data._id }, newData, { returnUpdatedDocs: true }, function () {
                        _this4.log('updated peer ' + peer.data.hostname + ':' + peer.data.port, data);
                        resolve(peer);
                    });
                });
            };
            return refreshPeer ? peer.update(newData, false).then(updater) : updater();
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

            this.log('Clearing');
            this.peers = [];
            return new Promise(function (resolve) {
                return _this5.db.remove({}, { multi: true }, resolve);
            });
        }

        /**
         * Returns peer, which hostname or IP equals the address.
         * Port is only considered if mutiPort option is true.
         * @param address
         * @returns {Promise<Peer|null>}
         */

    }, {
        key: 'findByAddress',
        value: function findByAddress(address, port) {
            var _this6 = this;

            var addr = PeerList.cleanAddress(address);
            return new Promise(function (resolve) {
                var findWithIP = function findWithIP(ip) {
                    var peers = _this6.peers.filter(function (p) {
                        return p.data.hostname === addr || p.data.hostname === address || ip && (p.data.hostname === ip || p.data.ip === ip);
                    });
                    resolve(_this6.opts.multiPort ? peers.filter(function (p) {
                        return p.data.port == port;
                    }) : peers);
                };

                if (ip.isV6Format(addr) || ip.isV4Format(addr) || _this6.opts.multiPort) {
                    findWithIP(addr);
                } else {
                    dns.resolve(addr, 'A', function (error, results) {
                        return findWithIP(error || !results.length ? null : results[0]);
                    });
                }
            });
        }

        /**
         * Returns whether the provided uri is from a trusted node
         * @param {URL|string} uri
         * @returns {Promise<boolean>}
         */

    }, {
        key: 'isTrusted',
        value: function isTrusted(uri) {
            var u = null;
            try {
                u = typeof uri === 'string' ? new URL(uri) : uri;
            } catch (error) {
                return false;
            }

            return this.findByAddress(u.hostname, u.port).then(function (peers) {
                return peers.filter(function (p) {
                    return p.isTrusted();
                }).length > 0;
            });
        }

        /**
         * Get a certain amount of weighted random peers.
         * The weight depends on relationship age (connections) and trust (weight).
         * @param {number} amount
         * @returns {Peer[]}
         */

    }, {
        key: 'getWeighted',
        value: function getWeighted() {
            var amount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

            amount = amount || this.peers.length;
            var peers = Array.from(this.peers);
            if (!peers.length) {
                return [];
            }

            var choices = [];
            var getChoice = function getChoice() {
                var peer = weighted(peers, peers.map(function (p) {
                    return Math.max(p.data.connected * p.data.weight, 1);
                }));
                peers.splice(peers.indexOf(peer), 1);
                choices.push(peer);
            };

            for (var x = 0; x < amount; x++) {
                getChoice();
                if (peers.length < 1) {
                    break;
                }
            }

            return choices.filter(function (c) {
                return c;
            });
        }

        /**
         *
         * Adds a new peer to the list using an URI
         * @param {string} hostname
         * @param {string|number} port
         * @param {string|number} TCPPort
         * @param {string|number} UDPPort
         * @param {boolean} isTrusted - whether this is a trusted peer
         * @param {number} weight
         * @returns {*}
         */

    }, {
        key: 'add',
        value: function add(hostname, port) {
            var TCPPort = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : DEFAULT_IRI_OPTIONS.TCPPort;
            var UDPPort = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : DEFAULT_IRI_OPTIONS.UDPPort;

            var _this7 = this;

            var isTrusted = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
            var weight = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;

            port = parseInt(port);
            TCPPort = parseInt(TCPPort || DEFAULT_IRI_OPTIONS.TCPPort);
            UDPPort = parseInt(UDPPort || DEFAULT_IRI_OPTIONS.UDPPort);
            return this.findByAddress(hostname, port).then(function (peers) {
                var addr = PeerList.cleanAddress(hostname);
                var existing = peers.length && peers[0];

                // If the hostname already exists and no multiple ports from same hostname are allowed,
                // update existing with port. Otherwise just return the existing peer.
                if (existing) {
                    if (!_this7.opts.multiPort && (port !== existing.data.port || TCPPort !== existing.data.TCPPort || UDPPort !== existing.data.UDPPort)) {
                        return _this7.update(existing, { port: port, TCPPort: TCPPort, UDPPort: UDPPort });
                    } else if (existing.data.weight < weight) {
                        return _this7.update(existing, { weight: weight });
                    } else {
                        return existing;
                    }
                } else {
                    _this7.log('adding', hostname, port);
                    var peerIP = ip.isV4Format(addr) || ip.isV6Format(addr) ? addr : null;
                    var peer = new Peer({ port: port, hostname: addr, ip: peerIP, TCPPort: TCPPort, UDPPort: UDPPort, isTrusted: isTrusted, weight: weight }, { onDataUpdate: _this7.onPeerUpdate });
                    _this7.peers.push(peer);
                    _this7.log('added', hostname, port, _this7.peers.length);
                    return new Promise(function (resolve, reject) {
                        _this7.db.insert(peer.data, function (err, doc) {
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