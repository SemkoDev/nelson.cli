const { getPeerStats } = require('./peer');
const version = require('../../package.json').version;

/**
 * Returns summary of the node stats
 * @param {Node} node
 * @returns {{newNodes: {hourAgo, fourAgo, twelveAgo, dayAgo, weekAgo}, activeNodes: {hourAgo, fourAgo, twelveAgo, dayAgo, weekAgo}}}
 */
function getSummary (node) {
    const now = new Date();
    const hour = 3600000;
    const hourAgo = new Date(now - hour);
    const fourAgo = new Date(now - (hour * 4));
    const twelveAgo = new Date(now - (hour * 12));
    const dayAgo = new Date(now - (hour * 24));
    const weekAgo = new Date(now - (hour * 24 * 7));
    return {
        newNodes: {
            hourAgo: node.list.all().filter(p => p.data.dateCreated >= hourAgo).length,
            fourAgo: node.list.all().filter(p => p.data.dateCreated >= fourAgo).length,
            twelveAgo: node.list.all().filter(p => p.data.dateCreated >= twelveAgo).length,
            dayAgo: node.list.all().filter(p => p.data.dateCreated >= dayAgo).length,
            weekAgo: node.list.all().filter(p => p.data.dateCreated >= weekAgo).length,
        },
        activeNodes: {
            hourAgo: node.list.all().filter(p => p.data.dateLastConnected >= hourAgo).length,
            fourAgo: node.list.all().filter(p => p.data.dateLastConnected >= fourAgo).length,
            twelveAgo: node.list.all().filter(p => p.data.dateLastConnected >= twelveAgo).length,
            dayAgo: node.list.all().filter(p => p.data.dateLastConnected >= dayAgo).length,
            weekAgo: node.list.all().filter(p => p.data.dateLastConnected >= weekAgo).length,
        }
    }
}

/**
 * Returns clean node stats to be used in the API
 * @param {Node} node
 * @returns {{name, version, ready: (boolean|*|null), isIRIHealthy: (*|boolean), iriStats: *, peerStats: {newNodes: {hourAgo, fourAgo, twelveAgo, dayAgo, weekAgo}, activeNodes: {hourAgo, fourAgo, twelveAgo, dayAgo, weekAgo}}, totalPeers, connectedPeers: Array, config: {cycleInterval: (Command.opts.cycleInterval|*), epochInterval: (Command.opts.epochInterval|*), beatInterval: (Command.opts.beatInterval|*), dataPath: (Command.opts.dataPath|*), port: (Command.opts.port|*), apiPort: (Command.opts.apiPort|*), IRIPort: (Command.opts.IRIPort|*), TCPPort: (Command.opts.TCPPort|*), UDPPort: (Command.opts.UDPPort|*), IRIProtocol: (Command.opts.IRIProtocol|*), isMaster: (Command.opts.isMaster|*), temporary: (Command.opts.temporary|*)}, heart: {lastCycle: (heart.lastCycle|Heart.lastCycle|_require2.Heart.lastCycle), lastEpoch: (heart.lastEpoch|Heart.lastEpoch|_require2.Heart.lastEpoch), personality: (heart.personality|Heart.personality|_require2.Heart.personality), currentCycle: (heart.currentCycle|Heart.currentCycle|_require2.Heart.currentCycle), currentEpoch: (heart.currentEpoch|Heart.currentEpoch|_require2.Heart.currentEpoch), startDate: (heart.startDate|Heart.startDate|_require2.Heart.startDate)}}}
 */
function getNodeStats (node) {
    const {
        cycleInterval,
        epochInterval,
        beatInterval,
        dataPath,
        port,
        apiPort,
        IRIPort,
        TCPPort,
        UDPPort,
        isMaster,
        IRIProtocol,
        temporary
    } = node.opts;
    const {
        lastCycle,
        lastEpoch,
        personality,
        currentCycle,
        currentEpoch,
        startDate
    } = node.heart;
    const totalPeers = node.list.all().length;
    const isIRIHealthy = node.iri && node.iri.isHealthy;
    const iriStats = node.iri && node.iri.iriStats;
    const connectedPeers = Array.from(node.sockets.keys())
        .filter((p) => node.sockets.get(p).readyState === 1)
        .map(getPeerStats);

    return {
        name: node.opts.name,
        version,
        ready: node._ready,
        isIRIHealthy,
        iriStats,
        peerStats: getSummary(node),
        totalPeers,
        connectedPeers,
        config: {
            cycleInterval,
            epochInterval,
            beatInterval,
            dataPath,
            port,
            apiPort,
            IRIPort,
            TCPPort,
            UDPPort,
            IRIProtocol,
            isMaster,
            temporary
        },
        heart: {
            lastCycle,
            lastEpoch,
            personality,
            currentCycle,
            currentEpoch,
            startDate
        }
    }
}

module.exports = {
    getSummary,
    getNodeStats
};
