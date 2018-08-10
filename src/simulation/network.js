const { utils, peer } = require('../node');
const { spawnNode } = require('./node');

const DEFAULT_OPTS = {
    silent: false,
    cycleInterval: 12,
    epochInterval: 36,
    nodesCount: 47,
    masterNodesCount: 3,
    startingPort: 14265,
    nodeStartDelayRange: [0, 6000],
    callbackInterval: 5000,
    onStats: (nodeStats) => {},
    onError: (nodeStats) => {}
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
function spawnMockedNetwork (options) {
    const {
        nodesCount, masterNodesCount, startingPort, silent, cycleInterval, epochInterval,
        onStats, onError, callbackInterval, nodeStartDelayRange
    } = { ...DEFAULT_OPTS, ...options};
    const baseNodeOptions = { silent, cycleInterval, epochInterval };
    const allNodes = [];
    const masterNodeURIs = [];
    const stats = {};

    let ended = false;
    let cbInterval = null;

    const hasEnded = () => ended;
    const prc = (p, port) => {
        p.on('message', (s) => stats[port] = s);
        p.on('error', onError);
        p.on('exit', () => !hasEnded() && onError());
    };

    // Start the master nodes
    for(let x = 0; x < masterNodesCount; x++) {
        const port = startingPort + x;
        const TCPPort = port + 10000;
        const UDPPort = port + 20000;
        if (ended) {
            break
        }
        const node = spawnNode({ ...baseNodeOptions, port, isMaster: true, neighbors: masterNodeURIs });
        prc(node, port);
        allNodes.push(node);
        masterNodeURIs.push(`localhost/${port}/${TCPPort}/${UDPPort}`);
    }

    // Sequentially start the normal nodes
    const promise = ".".repeat(nodesCount).split('').reduce((promise, value, y) => {
        return hasEnded() ? promise : promise.then((nodes) => {
            return new Promise((resolve) => {
                if (hasEnded()) {
                    return resolve(nodes)
                }
                setTimeout(() => {
                    if (hasEnded()) {
                        return resolve(nodes)
                    }
                    const port = startingPort + masterNodesCount + y;
                    const TCPPort = port + 10000;
                    const UDPPort = port + 20000;
                    const node = spawnNode({
                        ...baseNodeOptions,
                        port, TCPPort, UDPPort, neighbors: masterNodeURIs,
                        IRIProtocol: peer.PROTOCOLS[utils.getRandomInt(0, peer.PROTOCOLS.length)]
                    });
                    prc(node, port);
                    resolve([ ...nodes, node ])
                }, utils.getRandomInt(nodeStartDelayRange[0], nodeStartDelayRange[1]));
            })
        });
    }, Promise.resolve(allNodes));

    const end = () => {
        ended = true;
        cbInterval && clearInterval(cbInterval);
        return promise.then((nodes) => {
            !silent && console.log('STOPPING NETWORK');
            nodes.forEach(n => n.kill());
        })
    };

    if (callbackInterval) {
        cbInterval = setInterval(() => onStats(stats), callbackInterval);
    }

    return {
        end,
        onPeersAdded: () => { return promise },
        getStats: () => stats,
        getNodeProcesses: () => allNodes
    }

}

module.exports = {
    DEFAULT_OPTS,
    spawnMockedNetwork
};
