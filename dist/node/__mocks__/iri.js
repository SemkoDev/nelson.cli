'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var req = require.requireActual ? require.requireActual : require;

var _req = req('../iri'),
    BaseIRI = _req.IRI,
    DEFAULT_OPTIONS = _req.DEFAULT_OPTIONS;

/**
 * Class responsible to RUN and communicate with local IRI instance
 * @class
 */


var IRI = function (_BaseIRI) {
    _inherits(IRI, _BaseIRI);

    function IRI() {
        _classCallCheck(this, IRI);

        return _possibleConstructorReturn(this, (IRI.__proto__ || Object.getPrototypeOf(IRI)).apply(this, arguments));
    }

    _createClass(IRI, [{
        key: 'start',


        /**
         * Starts the IRI process, returning self on success.
         * @returns {Promise<IRI>}
         */
        value: function start() {
            var _this2 = this;

            return new Promise(function (resolve) {
                _this2._isStarted = true;
                _this2.isHealthy = true;
                _this2.ticker = setInterval(_this2._tick, 15000);
                _this2.getStats().then(function () {
                    return resolve(_this2);
                });
            });
        }

        /**
         * Removes a list of neighbors from IRI, except static neighbors. Returns list of removed peers.
         * @param {Peer[]} peers
         * @returns {Promise<Peer[]>}
         */

    }, {
        key: 'removeNeighbors',
        value: function removeNeighbors(peers) {
            if (!this.isAvailable()) {
                return Promise.reject();
            }

            return new Promise(function (resolve) {
                resolve(peers);
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
            if (!this.isAvailable()) {
                return Promise.reject();
            }

            return new Promise(function (resolve) {
                resolve(peers);
            });
        }

        /**
         * Cleans up any orphans from the IRI
         * @param {Peer[]} peers
         * @returns {Promise<URL[]>}
         */

    }, {
        key: 'cleanupNeighbors',
        value: function cleanupNeighbors(peers) {
            if (!this.isAvailable()) {
                return Promise.reject();
            }
            return new Promise(function (resolve) {
                resolve([]);
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
            var _this3 = this;

            if (!this.isAvailable()) {
                return Promise.reject();
            }

            if (!peers || !peers.length) {
                return Promise.resolve([]);
            }

            return new Promise(function (resolve, reject) {
                var addNeighbors = function addNeighbors() {
                    _this3.addNeighbors(peers).then(resolve).catch(reject);
                };

                addNeighbors();
            });
        }

        /**
         * Removes all IRI neighbors, except static neighbors.
         * @returns {Promise}
         */

    }, {
        key: 'removeAllNeighbors',
        value: function removeAllNeighbors() {
            if (!this.isAvailable()) {
                return Promise.reject();
            }

            return new Promise(function (resolve) {
                resolve();
            });
        }

        /**
         * Returns IRI node info
         * @returns {Promise<object>}
         */

    }, {
        key: 'getStats',
        value: function getStats() {
            var _this4 = this;

            return new Promise(function (resolve) {
                _this4.iriStats = { mock: true };
                resolve(_this4.iriStats);
            });
        }
    }, {
        key: '_tick',
        value: function _tick() {
            var onHealthCheck = this.opts.onHealthCheck;

            this.getStats().then(function () {
                onHealthCheck(true, []);
            });
        }
    }]);

    return IRI;
}(BaseIRI);

IRI.isMocked = true;

module.exports = {
    IRI: IRI,
    DEFAULT_OPTIONS: DEFAULT_OPTIONS
};