'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var IOTA = require('iota.lib.js');
var tmp = require('tmp');

var _require = require('./base'),
    Base = _require.Base;

var _require2 = require('./tools/utils'),
    getIP = _require2.getIP;

tmp.setGracefulCleanup();

var DEFAULT_OPTIONS = {
    hostname: 'localhost',
    port: 14265,
    TCPPort: 15600,
    UDPPort: 14600,
    logIdent: 'IRI',
    onHealthCheck: function onHealthCheck(isHealthy, neighbors) {}
};

/**
 * Class responsible to RUN and communicate with local IRI instance
 * @class
 */

var IRI = function (_Base) {
    _inherits(IRI, _Base);

    function IRI(options) {
        _classCallCheck(this, IRI);

        var _this = _possibleConstructorReturn(this, (IRI.__proto__ || Object.getPrototypeOf(IRI)).call(this, _extends({}, DEFAULT_OPTIONS, options)));

        _this.api = new IOTA({ host: 'http://' + _this.opts.hostname, port: _this.opts.port }).api;
        _this.removeNeighbors = _this.removeNeighbors.bind(_this);
        _this.addNeighbors = _this.addNeighbors.bind(_this);
        _this.updateNeighbors = _this.updateNeighbors.bind(_this);
        _this._tick = _this._tick.bind(_this);
        _this.ticker = null;
        _this.isHealthy = false;
        _this.staticNeighbors = [];
        return _this;
    }

    /**
     * Starts the IRI process, returning self on success.
     * @returns {Promise<IRI>}
     */


    _createClass(IRI, [{
        key: 'start',
        value: function start() {
            var _this2 = this;

            return new Promise(function (resolve) {
                var getNodeInfo = function getNodeInfo() {
                    return _this2.api.getNeighbors(function (error, neighbors) {
                        if (!error) {
                            var addresses = neighbors.map(function (n) {
                                return n.address.split(':')[0];
                            });
                            Promise.all(addresses.map(getIP)).then(function (ips) {
                                _this2._isStarted = true;
                                _this2.isHealthy = true;
                                _this2.staticNeighbors = ips.concat(addresses);
                                _this2.log('Static neighbors: ' + addresses);
                                // TODO: make ticker wait for result, like in the heart.
                                _this2.ticker = setInterval(_this2._tick, 15000);
                                resolve(_this2);
                            });
                        } else {
                            _this2.log(('IRI not ready on ' + _this2.opts.hostname + ':' + _this2.opts.port + ', retrying...').yellow);
                            setTimeout(getNodeInfo, 5000);
                        }
                    });
                };
                getNodeInfo();
            });
        }
    }, {
        key: 'end',
        value: function end() {
            this.isHealthy = false;
            this._isStarted = false;
            this.staticNeighbors = [];
            this.ticker && clearTimeout(this.ticker);
            this.ticker = null;
        }

        /**
         * Returns whether the process has been started.
         * @returns {boolean}
         */

    }, {
        key: 'isStarted',
        value: function isStarted() {
            return this._isStarted;
        }

        /**
         * Returns whether the IRI process is running and can be communicated with.
         * @returns {boolean}
         */

    }, {
        key: 'isAvailable',
        value: function isAvailable() {
            return this.isStarted() && this.isHealthy;
        }

        /**
         * Returns whether a peer's IP or hostname is added as static neighbor in IRI.
         * @param {Peer} peer
         * @returns {boolean}
         */

    }, {
        key: 'isStaticNeighbor',
        value: function isStaticNeighbor(peer) {
            return !!this.staticNeighbors.filter(function (n) {
                return n === peer.data.ip || n === peer.data.hostname;
            }).length;
        }

        /**
         * Removes a list of neighbors from IRI, except static neighbors. Returns list of removed peers.
         * @param {Peer[]} peers
         * @returns {Promise<Peer[]>}
         */

    }, {
        key: 'removeNeighbors',
        value: function removeNeighbors(peers) {
            var _this3 = this;

            if (!this.isAvailable()) {
                return Promise.reject();
            }

            var myPeers = peers.filter(function (peer) {
                if (_this3.isStaticNeighbor(peer)) {
                    _this3.log(('WARNING: trying to remove a static neighbor. Skipping: ' + peer.getUDPURI()).yellow);
                    return false;
                }
                return true;
            });

            if (!peers.length) {
                return Promise.resolve([]);
            }

            var uris = myPeers.map(function (p) {
                return p.getUDPURI();
            });
            return new Promise(function (resolve, reject) {
                _this3.api.removeNeighbors(uris, function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    _this3.log('Neighbors removed (if there were any):'.red, myPeers.map(function (p) {
                        return p.getUDPURI();
                    }));
                    resolve(peers);
                });
            });
        }

        /**
         * Adds a list of peers to IRI.
         * @param {Peer[]} peers
         * @returns {Promise<Peer[]>}
         */

    }, {
        key: 'addNeighbors',
        value: function addNeighbors(peers) {
            var _this4 = this;

            if (!this.isAvailable()) {
                return Promise.reject();
            }

            var uris = peers.map(function (p) {
                return p.getUDPURI();
            });

            return new Promise(function (resolve, reject) {
                _this4.api.addNeighbors(uris, function (error, data) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    _this4.log('Neighbors added:'.green, data, uris.join(', '));
                    resolve(peers);
                });
            });
        }

        /**
         * Updates the list of neighbors at the IRI backend. Removes all neighbors, replacing them with
         * the newly provided neighbors.
         * @param {Peer[]} peers
         * @returns {Promise<Peer[]>}
         */

    }, {
        key: 'updateNeighbors',
        value: function updateNeighbors(peers) {
            var _this5 = this;

            if (!this.isAvailable()) {
                return Promise.reject();
            }

            if (!peers || !peers.length) {
                return Promise.resolve([]);
            }

            return new Promise(function (resolve, reject) {
                var addNeighbors = function addNeighbors() {
                    _this5.addNeighbors(peers).then(resolve).catch(reject);
                };

                _this5.api.getNeighbors(function (error, neighbors) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    Array.isArray(neighbors) && neighbors.length ? _this5.api.removeNeighbors(neighbors.map(function (n) {
                        return n.connectionType + '://' + n.address;
                    }), addNeighbors) : addNeighbors();
                });
            });
        }

        /**
         * Removes all IRI neighbors, except static neighbors.
         * @returns {Promise}
         */

    }, {
        key: 'removeAllNeighbors',
        value: function removeAllNeighbors() {
            var _this6 = this;

            if (!this.isAvailable()) {
                return Promise.reject();
            }

            return new Promise(function (resolve) {
                _this6.api.getNeighbors(function (error, neighbors) {
                    if (error) {
                        return resolve();
                    }
                    if (Array.isArray(neighbors) && neighbors.length) {
                        var toRemove = neighbors.filter(function (n) {
                            return !_this6.staticNeighbors.includes(n.address);
                        });
                        return _this6.api.removeNeighbors(toRemove.map(function (n) {
                            return n.connectionType + '://' + n.address;
                        }), resolve);
                    }
                    resolve();
                });
            });
        }

        /**
         * Checks if the IRI instance is healthy, and its list of neighbors. Calls back the result to onHealthCheck.
         * @private
         */

    }, {
        key: '_tick',
        value: function _tick() {
            var _this7 = this;

            var onHealthCheck = this.opts.onHealthCheck;

            this.api.getNeighbors(function (error, neighbors) {
                if (error) {
                    _this7.isHealthy = false;
                    onHealthCheck(false);
                    return;
                }
                _this7.isHealthy = true;
                // TODO: if the address is IPV6, could that pose a problem?
                onHealthCheck(true, neighbors.map(function (n) {
                    return n.address.split(':')[0];
                }));
            });
        }
    }]);

    return IRI;
}(Base);

module.exports = {
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    IRI: IRI
};