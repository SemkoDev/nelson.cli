'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var _require = require('../node'),
    utils = _require.utils,
    peer = _require.peer;

var _require2 = require('./node'),
    spawnNode = _require2.spawnNode;

var DEFAULT_OPTS = {
    silent: false,
    cycleInterval: 12,
    epochInterval: 36,
    nodesCount: 47,
    masterNodesCount: 3,
    startingPort: 14265,
    nodeStartDelayRange: [0, 6000],
    callbackInterval: 5000,
    onStats: function onStats(nodeStats) {},
    onError: function onError(nodeStats) {}
};

// TODO: update jsdoc
/**
 * Initializes and starts a simulation with a set of mocked nodes.
 * First, the master nodes are started all at once. Then the normal nodes are added sequentially
 * in a random interval (using options.nodeStartDelayRange).
 *
 * @param {object} options
 * @param {number} options.nodesCount - the amount of "normal" nodes to start
 * @param {number} options.masterNodesCount - the amount of "master" nodes to start
 * @param {number} options.startingPort - Port number to start the nodes from incrementally
 * @param {function} options.onStats - periodic callback with connection summary
 * @param {function} options.onError - on child process exit or error
 * @param {boolean} options.callbackInterval - in seconds
 * @param {number[]} options.nodeStartDelayRange - how many ms to wait between normal nodes starting
 * @returns {{stop: (function()), onPeersAdded: (function())}}
 */
function spawnMockedNetwork(options) {
    var _DEFAULT_OPTS$options = _extends({}, DEFAULT_OPTS, options),
        nodesCount = _DEFAULT_OPTS$options.nodesCount,
        masterNodesCount = _DEFAULT_OPTS$options.masterNodesCount,
        startingPort = _DEFAULT_OPTS$options.startingPort,
        silent = _DEFAULT_OPTS$options.silent,
        cycleInterval = _DEFAULT_OPTS$options.cycleInterval,
        epochInterval = _DEFAULT_OPTS$options.epochInterval,
        onStats = _DEFAULT_OPTS$options.onStats,
        onError = _DEFAULT_OPTS$options.onError,
        callbackInterval = _DEFAULT_OPTS$options.callbackInterval,
        nodeStartDelayRange = _DEFAULT_OPTS$options.nodeStartDelayRange;

    var baseNodeOptions = { silent: silent, cycleInterval: cycleInterval, epochInterval: epochInterval };
    var allNodes = [];
    var masterNodeURIs = [];
    var stats = {};

    var ended = false;
    var cbInterval = null;

    var hasEnded = function hasEnded() {
        return ended;
    };
    var prc = function prc(p, port) {
        p.on('message', function (s) {
            return stats[port] = s;
        });
        p.on('error', onError);
        p.on('exit', function () {
            return !hasEnded() && onError();
        });
    };

    // Start the master nodes
    for (var x = 0; x < masterNodesCount; x++) {
        var port = startingPort + x;
        var TCPPort = port + 10000;
        var UDPPort = port + 20000;
        if (ended) {
            break;
        }
        var node = spawnNode(_extends({}, baseNodeOptions, { port: port, isMaster: true, neighbors: masterNodeURIs }));
        prc(node, port);
        allNodes.push(node);
        masterNodeURIs.push('localhost/' + port + '/' + TCPPort + '/' + UDPPort);
    }

    // Sequentially start the normal nodes
    var promise = ".".repeat(nodesCount).split('').reduce(function (promise, value, y) {
        return hasEnded() ? promise : promise.then(function (nodes) {
            return new Promise(function (resolve) {
                if (hasEnded()) {
                    return resolve(nodes);
                }
                setTimeout(function () {
                    if (hasEnded()) {
                        return resolve(nodes);
                    }
                    var port = startingPort + masterNodesCount + y;
                    var TCPPort = port + 10000;
                    var UDPPort = port + 20000;
                    var node = spawnNode(_extends({}, baseNodeOptions, {
                        port: port, TCPPort: TCPPort, UDPPort: UDPPort, neighbors: masterNodeURIs,
                        IRIProtocol: peer.PROTOCOLS[utils.getRandomInt(0, peer.PROTOCOLS.length)]
                    }));
                    prc(node, port);
                    resolve([].concat(_toConsumableArray(nodes), [node]));
                }, utils.getRandomInt(nodeStartDelayRange[0], nodeStartDelayRange[1]));
            });
        });
    }, Promise.resolve(allNodes));

    var end = function end() {
        ended = true;
        cbInterval && clearInterval(cbInterval);
        return promise.then(function (nodes) {
            !silent && console.log('STOPPING NETWORK');
            nodes.forEach(function (n) {
                return n.kill();
            });
        });
    };

    if (callbackInterval) {
        cbInterval = setInterval(function () {
            return onStats(stats);
        }, callbackInterval);
    }

    return {
        end: end,
        onPeersAdded: function onPeersAdded() {
            return promise;
        },
        getStats: function getStats() {
            return stats;
        },
        getNodeProcesses: function getNodeProcesses() {
            return allNodes;
        }
    };
}

module.exports = {
    DEFAULT_OPTS: DEFAULT_OPTS,
    spawnMockedNetwork: spawnMockedNetwork
};