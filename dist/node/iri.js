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

tmp.setGracefulCleanup();

var DEFAULT_OPTIONS = {
    hostname: 'localhost',
    port: 14600,
    TCPPort: 15600,
    UDPPort: 14600,
    logIdent: 'IRI',
    onHealthCheck: function onHealthCheck(isHealthy, neighbors) {}
};

// TODO: Regular IRI health-checks needed. Prevent Nelson from connecting if IRI is down.
// TODO: regular neighbors check. If IRI removed some, disconnect the related nelson nodes.

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

            return new Promise(function (resolve, reject) {
                _this2.api.getNodeInfo(function (error) {
                    if (!error) {
                        _this2._isStarted = true;
                        _this2.isHealthy = true;
                        _this2.ticker = setInterval(_this2._tick, 12000);
                        resolve(_this2);
                    } else {
                        reject(error);
                    }
                });
            });
        }
    }, {
        key: 'end',
        value: function end() {
            this.ticker && clearTimeout(this.ticker);
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
            return this.isStarted() && !this._isFinished;
        }

        /**
         * Removes a list of neighbors from IRI
         * @param {Peer[]} peers
         * @returns {Promise<Peer[]>}
         */

    }, {
        key: 'removeNeighbors',
        value: function removeNeighbors(peers) {
            var _this3 = this;

            var uris = peers.map(function (p) {
                return p.getTCPURI();
            });
            uris.concat(peers.map(function (p) {
                return p.getUDPURI();
            }));
            return new Promise(function (resolve, reject) {
                _this3.api.getNeighbors(function (error, neighbors) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    var toRemove = neighbors.map(function (n) {
                        return n.connectionType + '://' + n.address;
                    }).filter(function (n) {
                        return uris.includes(n);
                    });
                    if (toRemove.length) {
                        _this3.api.removeNeighbors(toRemove, function (err) {
                            if (err) {
                                reject(err);
                                return;
                            }
                            _this3.log('Neighbors removed', peers.map(function (p) {
                                return p.getNelsonURI();
                            }));
                            resolve(peers);
                        });
                    } else {
                        resolve(peers);
                    }
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

            var uris = peers.map(function (p) {
                return p.getTCPURI();
            });
            return new Promise(function (resolve, reject) {
                _this4.api.addNeighbors(uris, function (error, data) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    _this4.log('Neighbors added:', data, uris.join(', '));
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
         * Checks if the IRI instance is healthy, and its list of neighbors. Calls back the result to onHealthCheck.
         * @private
         */

    }, {
        key: '_tick',
        value: function _tick() {
            var _this6 = this;

            var onHealthCheck = this.opts.onHealthCheck;

            this.api.getNeighbors(function (error, neighbors) {
                if (error) {
                    _this6.isHealthy = false;
                    onHealthCheck(false);
                    return;
                }
                _this6.isHealthy = true;
                onHealthCheck(true, neighbors.map(function (n) {
                    return n.connectionType + '://' + n.address;
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