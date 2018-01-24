'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('../node'),
    BaseNode = _require.Node,
    DEFAULT_NODE_OPTIONS = _require.DEFAULT_OPTIONS;

var _require2 = require('../tools/utils'),
    getRandomInt = _require2.getRandomInt;

var _require3 = require('./iri'),
    IRI = _require3.IRI;

var DEFAULT_OPTIONS = _extends({}, DEFAULT_NODE_OPTIONS, {
    localNodes: true,
    beatInterval: 2,
    cycleInterval: 3,
    epochInterval: 30,
    lazyLimit: 6,
    testnet: true,
    temporary: true
});

/**
 * This is a mock for the "real" node. What it does are several things:
 *
 * 1. Mock away IRI backend so we do not start it. We just want to test the P2P functionality.
 * 2. Create a separate neighbor database for each node.
 * 3. Report stats to the parent process
 *
 * @class Node
 */

var Node = function (_BaseNode) {
    _inherits(Node, _BaseNode);

    function Node(options) {
        _classCallCheck(this, Node);

        var _this = _possibleConstructorReturn(this, (Node.__proto__ || Object.getPrototypeOf(Node)).call(this, _extends({}, DEFAULT_OPTIONS, options)));

        _this.sendStats = _this.sendStats.bind(_this);
        setInterval(_this.sendStats, 1000);
        return _this;
    }

    _createClass(Node, [{
        key: '_getIRI',
        value: function _getIRI() {
            var _this2 = this;

            var _opts = this.opts,
                APIPort = _opts.APIPort,
                TCPPort = _opts.TCPPort,
                UDPPort = _opts.UDPPort,
                testnet = _opts.testnet,
                silent = _opts.silent,
                temporary = _opts.temporary;


            return new IRI({
                APIPort: APIPort, TCPPort: TCPPort, UDPPort: UDPPort, testnet: testnet, silent: silent, temporary: temporary,
                logIdent: this.opts.port + '::IRI'
            }).start().then(function (iri) {
                _this2.iri = iri;
                return iri;
            });
        }
    }, {
        key: '_setPublicIP',
        value: function _setPublicIP() {
            this.ipv4 = 'localhost';
            return Promise.resolve(0);
        }
    }, {
        key: '_onIRIHealth',
        value: function _onIRIHealth() {
            Array.from(this.sockets.keys()).forEach(function (peer) {
                peer.updateConnection({
                    numberOfAllTransactions: getRandomInt(0, 1000),
                    numberOfNewTransactions: getRandomInt(0, 150),
                    numberOfRandomTransactionRequests: getRandomInt(0, 100),
                    numberOfInvalidTransactions: getRandomInt(0, 10)
                });
            });
        }

        /////////////////////////////////// MOCK SPECIFICS ///////////////////////////////////

    }, {
        key: 'sendStats',
        value: function sendStats() {
            var _this3 = this;

            var sockets = Array.from(this.sockets.values());

            process.send({
                isMaster: this.opts.isMaster,
                peers: this.list ? this.list.all().map(function (p) {
                    return p.data.port;
                }) : [],
                connections: {
                    list: Array.from(this.sockets.keys()).filter(function (k) {
                        return _this3.sockets.get(k).readyState === 1;
                    }).map(function (peer) {
                        return '' + peer.data.port;
                    }),
                    connecting: sockets.filter(function (s) {
                        return s.readyState === 0;
                    }).length,
                    connected: sockets.filter(function (s) {
                        return s.readyState === 1;
                    }).length,
                    closed: sockets.filter(function (s) {
                        return s.readyState > 1;
                    }).length
                }
            });
        }
    }]);

    return Node;
}(BaseNode);

module.exports = {
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    Node: Node
};