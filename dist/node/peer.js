'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ip = require('ip');
var dns = require('dns');

var _require = require('./base'),
    Base = _require.Base;

var _require2 = require('./iri'),
    DEFAULT_IRI_OPTIONS = _require2.DEFAULT_OPTIONS;

var _require3 = require('./utils'),
    getSecondsPassed = _require3.getSecondsPassed;

var DEFAULT_OPTIONS = {
    onDataUpdate: function onDataUpdate(data) {
        return Promise.resolve();
    },
    ipRefreshTimeout: 1200,
    silent: true,
    logIdent: 'PEER'
};
var DEFAULT_PEER_DATA = {
    hostname: null,
    ip: null,
    port: 31337,
    TCPPort: DEFAULT_IRI_OPTIONS.TCPPort,
    UDPPort: DEFAULT_IRI_OPTIONS.UDPPort,
    seen: 1,
    connected: 0,
    tried: 0,
    weight: 1.0,
    dateTried: null,
    dateLastConnected: null,
    dateCreated: null,
    isTrusted: false
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

        var _this = _possibleConstructorReturn(this, (Peer.__proto__ || Object.getPrototypeOf(Peer)).call(this, _extends({}, DEFAULT_OPTIONS, options)));

        _this.data = null;

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
                if (!_this3.data.ip || !_this3._isHostnameIP() && _this3._isIPOutdated()) {
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
    }, {
        key: 'getTCPURI',
        value: function getTCPURI() {
            return 'tcp://' + this.data.hostname + ':' + this.data.TCPPort;
        }
    }, {
        key: 'getUDPURI',
        value: function getUDPURI() {
            return 'udp://' + this.data.hostname + ':' + this.data.UDPPort;
        }
    }, {
        key: 'getNelsonURI',
        value: function getNelsonURI() {
            return 'http://' + this.data.hostname + ':' + this.data.port;
        }
    }, {
        key: 'getHostname',
        value: function getHostname() {
            return this.data.hostname + '/' + this.data.port + '/' + this.data.TCPPort + '/' + this.data.UDPPort;
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
    Peer: Peer
};