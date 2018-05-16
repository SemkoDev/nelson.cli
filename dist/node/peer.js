'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ip = require('ip');
var dns = require('dns');

var _require = require('./base'),
    Base = _require.Base;

var _require2 = require('./iri'),
    DEFAULT_IRI_OPTIONS = _require2.DEFAULT_OPTIONS;

var _require3 = require('./tools/utils'),
    getSecondsPassed = _require3.getSecondsPassed,
    createIdentifier = _require3.createIdentifier;

var PROTOCOLS = ['tcp', 'udp', 'prefertcp', 'preferudp', 'any'];
var DEFAULT_OPTIONS = {
    onDataUpdate: function onDataUpdate(data) {
        return Promise.resolve();
    },
    ipRefreshTimeout: 1200,
    silent: true,
    logIdent: 'PEER',
    lazyLimit: 300, // Time, after which a peer is considered lazy, if no new TXs received
    lazyTimesLimit: 3 // starts to penalize peer's quality if connected so many times without new TXs
};
var DEFAULT_PEER_DATA = {
    name: null,
    hostname: null,
    ip: null,
    port: 31337,
    TCPPort: DEFAULT_IRI_OPTIONS.TCPPort,
    UDPPort: DEFAULT_IRI_OPTIONS.UDPPort,
    IRIProtocol: 'udp', // Assume all old Nelsons to be running udp.
    seen: 1,
    connected: 0,
    tried: 0,
    weight: 0,
    dateTried: null,
    dateLastConnected: null,
    dateCreated: null,
    isTrusted: false,
    key: null,
    remoteKey: null,
    lastConnections: []
};

/**
 * A utility class for a peer that holds peer's data and provides a few util methods.
 *
 * @class Peer
 */

var Peer = function (_Base) {
    _inherits(Peer, _Base);

    function Peer() {
        var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var options = arguments[1];

        _classCallCheck(this, Peer);

        var _this = _possibleConstructorReturn(this, (Peer.__proto__ || Object.getPrototypeOf(Peer)).call(this, _extends({}, DEFAULT_OPTIONS, options, { logIdent: data.hostname + ':' + data.port })));

        _this.data = null;
        _this.lastConnection = null;
        // Make sure to migrate database if anything else is added to the defaults...
        _this.update(_extends({}, DEFAULT_PEER_DATA, data));
        return _this;
    }

    /**
     * Partial peer's data update
     * @param {Object} data
     * @param {boolean} doCallback - whether to call back on data changes
     * @returns {Promise<Object>} - updates data
     */


    _createClass(Peer, [{
        key: 'update',
        value: function update(data) {
            var _this2 = this;

            var doCallback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

            // Reset last updated date if the hostname has changed
            var shouldUpdate = false;
            var hostnameChanged = this.data && this.data.hostname !== (data && data.hostname);
            this.iplastUpdated = this.data && hostnameChanged ? null : this.iplastUpdated;
            this.data = _extends({}, this.data, data);
            if (hostnameChanged && this.data.ip) {
                this.data.ip = null;
                shouldUpdate = true;
            }
            if (!this.data.ip) {
                this.data.ip = this._isHostnameIP() ? this.data.hostname : null;
                shouldUpdate = true;
            }
            return shouldUpdate && doCallback ? this.opts.onDataUpdate(this).then(function () {
                return _this2.data;
            }) : Promise.resolve(this.data);
        }

        /**
         * Gets the IP address of the peer. Independently if peer's address is a hostname or IP.
         * Update's the peer data to save the last known IP.
         * @returns {Promise<string>}
         */

    }, {
        key: 'getIP',
        value: function getIP() {
            var _this3 = this;

            return new Promise(function (resolve) {
                if (!_this3._hasCorrectIP() || !_this3._isHostnameIP() && _this3._isIPOutdated()) {
                    dns.resolve(_this3.data.hostname, 'A', function (error, results) {
                        // if there was an error, we set the hostname as ip, even if it's not the case.
                        // It will be re-tried next refresh cycle.
                        var ip = error || !results.length ? null : results[0];
                        _this3.iplastUpdated = new Date();
                        if (ip && ip !== _this3.data.ip) {
                            _this3.data.ip = ip;
                            _this3.opts.onDataUpdate(_this3).then(function () {
                                return resolve(ip);
                            });
                        } else {
                            resolve(ip);
                        }
                    });
                } else {
                    resolve(_this3.data.ip);
                }
            });
        }

        /**
         * Marks this node as connected.
         * @param {number} ping
         * @returns {Promise.<Peer>}
         */

    }, {
        key: 'markConnected',
        value: function markConnected(ping) {
            var _this4 = this;

            if (this.lastConnection) {
                return Promise.resolve(this);
            }
            this.lastConnection = {
                start: new Date(),
                duration: 0,
                ping: ping,
                numberOfAllTransactions: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            };

            return this.update({
                key: this.data.key || createIdentifier(),
                tried: 0,
                connected: this.data.connected + 1,
                dateLastConnected: new Date()
            }).then(function () {
                return _this4;
            });
        }

        /**
         * Marks the node as disconnected. Saves connection stats in DB.
         * @returns {Promise.<Peer>}
         */

    }, {
        key: 'markDisconnected',
        value: function markDisconnected() {
            var _this5 = this;

            if (!this.lastConnection) {
                return Promise.resolve(this);
            }

            var lastConnections = [].concat(_toConsumableArray(this.data.lastConnections), [_extends({}, this.lastConnection, {
                end: new Date(),
                duration: this.getConnectionDuration()
            })]).slice(-10);

            this.lastConnection = null;
            return this.update({ lastConnections: lastConnections }).then(function () {
                return _this5;
            });
        }

        /**
         * Returns time in seconds that passed since the node has been connected
         * @returns {number}
         */

    }, {
        key: 'getConnectionDuration',
        value: function getConnectionDuration() {
            if (!this.lastConnection) {
                return 0;
            }
            return getSecondsPassed(this.lastConnection.start);
        }

        /**
         * Updates the stats of the currently connected peer
         * @param data
         */

    }, {
        key: 'updateConnection',
        value: function updateConnection(data) {
            if (!this.lastConnection) {
                return;
            }

            var numberOfAllTransactions = data.numberOfAllTransactions,
                numberOfRandomTransactionRequests = data.numberOfRandomTransactionRequests,
                numberOfNewTransactions = data.numberOfNewTransactions,
                numberOfInvalidTransactions = data.numberOfInvalidTransactions;

            this.lastConnection = _extends({}, this.lastConnection, {
                numberOfAllTransactions: numberOfAllTransactions,
                numberOfRandomTransactionRequests: numberOfRandomTransactionRequests,
                numberOfNewTransactions: numberOfNewTransactions,
                numberOfInvalidTransactions: numberOfInvalidTransactions
            });
        }

        /**
         * Returns peer's quality based on last connection stats.
         * @returns {number}
         */

    }, {
        key: 'getPeerQuality',
        value: function getPeerQuality() {
            var _this6 = this;

            var history = [].concat(_toConsumableArray(this.data.lastConnections), [this.lastConnection]).filter(function (h) {
                return h;
            });
            var meanPing = history.reduce(function (s, h) {
                return s + (h.ping || _this6.opts.ipRefreshTimeout);
            }, 0) / (history.length || 1);
            var newTrans = history.reduce(function (s, h) {
                return s + h.numberOfNewTransactions;
            }, 0);
            var badTrans = history.reduce(function (s, h) {
                return s + h.numberOfInvalidTransactions;
            }, 0);
            var rndTrans = history.reduce(function (s, h) {
                return s + (h.numberOfRandomTransactionRequests || 0);
            }, 0);
            var badRatio = parseFloat(badTrans * 5 + rndTrans) / (newTrans || 1);
            var serialPenalization = !this.isTrusted() && !newTrans && history.length >= this.opts.lazyTimesLimit ? 1.0 / history.length : 1.0;
            var score = 3 / 4 * (Math.max(0.0, 1.0 / (badRatio || 1)) * serialPenalization) + 1 / 4 * (1 - Math.log(meanPing || this.opts.ipRefreshTimeout) / Math.log(this.opts.ipRefreshTimeout));
            return Math.max(0.01, score);
        }

        /**
         * Returns whether a connected peer has not sent any new transactions for a prolonged period of time.
         * @returns {boolean}
         */

    }, {
        key: 'isLazy',
        value: function isLazy() {
            return this.lastConnection && getSecondsPassed(this.lastConnection.start) > this.opts.lazyLimit && (this.lastConnection.numberOfNewTransactions === 0 || this.lastConnection.numberOfNewTransactions < this.lastConnection.numberOfRandomTransactionRequests);
        }
    }, {
        key: 'getTCPURI',
        value: function getTCPURI() {
            return 'tcp://' + this._getIPString(this.data.hostname) + ':' + this.data.TCPPort;
        }
    }, {
        key: 'getUDPURI',
        value: function getUDPURI() {
            return 'udp://' + this._getIPString(this.data.hostname) + ':' + this.data.UDPPort;
        }
    }, {
        key: 'getNelsonURI',
        value: function getNelsonURI() {
            return 'http://' + this._getIPString(this.data.hostname) + ':' + this.data.port;
        }
    }, {
        key: 'getNelsonWebsocketURI',
        value: function getNelsonWebsocketURI() {
            return 'ws://' + this._getIPString(this.data.hostname) + ':' + this.data.port;
        }
    }, {
        key: 'getHostname',
        value: function getHostname() {
            return this.data.hostname + '/' + this.data.port + '/' + this.data.TCPPort + '/' + this.data.UDPPort + '/0/' + this.data.IRIProtocol;
        }
    }, {
        key: 'isTrusted',
        value: function isTrusted() {
            return this.data && this.data.isTrusted;
        }
    }, {
        key: 'isSameIP',
        value: function isSameIP(ip) {
            return this.getIP().then(function (myIP) {
                return myIP && myIP === ip;
            });
        }
    }, {
        key: '_isHostnameIP',
        value: function _isHostnameIP() {
            return ip.isV4Format(this.data.hostname) || ip.isV6Format(this.data.hostname);
        }
    }, {
        key: '_hasCorrectIP',
        value: function _hasCorrectIP() {
            return this.data.ip && (ip.isV4Format(this.data.ip) || ip.isV6Format(this.data.ip));
        }
    }, {
        key: '_getIPString',
        value: function _getIPString(ipOrHostname) {
            return ipOrHostname.includes(':') ? '[' + ipOrHostname + ']' : ipOrHostname;
        }
    }, {
        key: '_isIPOutdated',
        value: function _isIPOutdated() {
            return !this.iplastUpdated || getSecondsPassed(this.iplastUpdated) > this.opts.ipRefreshTimeout;
        }
    }]);

    return Peer;
}(Base);

module.exports = {
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    DEFAULT_PEER_DATA: DEFAULT_PEER_DATA,
    PROTOCOLS: PROTOCOLS,
    Peer: Peer
};