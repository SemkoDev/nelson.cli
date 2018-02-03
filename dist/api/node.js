'use strict';

var _require = require('./peer'),
    getPeerStats = _require.getPeerStats;

var version = require('../../package.json').version;

/**
 * Returns summary of the node stats
 * @param {Node} node
 * @returns {{newNodes: {hourAgo, fourAgo, twelveAgo, dayAgo, weekAgo}, activeNodes: {hourAgo, fourAgo, twelveAgo, dayAgo, weekAgo}}}
 */
function getSummary(node) {
    var now = new Date();
    var hour = 3600000;
    var hourAgo = new Date(now - hour);
    var fourAgo = new Date(now - hour * 4);
    var twelveAgo = new Date(now - hour * 12);
    var dayAgo = new Date(now - hour * 24);
    var weekAgo = new Date(now - hour * 24 * 7);
    return {
        newNodes: {
            hourAgo: node.list.all().filter(function (p) {
                return p.data.dateCreated >= hourAgo;
            }).length,
            fourAgo: node.list.all().filter(function (p) {
                return p.data.dateCreated >= fourAgo;
            }).length,
            twelveAgo: node.list.all().filter(function (p) {
                return p.data.dateCreated >= twelveAgo;
            }).length,
            dayAgo: node.list.all().filter(function (p) {
                return p.data.dateCreated >= dayAgo;
            }).length,
            weekAgo: node.list.all().filter(function (p) {
                return p.data.dateCreated >= weekAgo;
            }).length
        },
        activeNodes: {
            hourAgo: node.list.all().filter(function (p) {
                return p.data.dateLastConnected >= hourAgo;
            }).length,
            fourAgo: node.list.all().filter(function (p) {
                return p.data.dateLastConnected >= fourAgo;
            }).length,
            twelveAgo: node.list.all().filter(function (p) {
                return p.data.dateLastConnected >= twelveAgo;
            }).length,
            dayAgo: node.list.all().filter(function (p) {
                return p.data.dateLastConnected >= dayAgo;
            }).length,
            weekAgo: node.list.all().filter(function (p) {
                return p.data.dateLastConnected >= weekAgo;
            }).length
        }
    };
}

/**
 * Returns clean node stats to be used in the API
 * @param {Node} node
 * @returns {{name, version, ready: (boolean|*|null), isIRIHealthy: (*|boolean), iriStats: *, peerStats: {newNodes: {hourAgo, fourAgo, twelveAgo, dayAgo, weekAgo}, activeNodes: {hourAgo, fourAgo, twelveAgo, dayAgo, weekAgo}}, totalPeers, connectedPeers: Array, config: {cycleInterval: (Command.opts.cycleInterval|*), epochInterval: (Command.opts.epochInterval|*), beatInterval: (Command.opts.beatInterval|*), dataPath: (Command.opts.dataPath|*), port: (Command.opts.port|*), apiPort: (Command.opts.apiPort|*), IRIPort: (Command.opts.IRIPort|*), TCPPort: (Command.opts.TCPPort|*), UDPPort: (Command.opts.UDPPort|*), IRIProtocol: (Command.opts.IRIProtocol|*), isMaster: (Command.opts.isMaster|*), temporary: (Command.opts.temporary|*)}, heart: {lastCycle: (heart.lastCycle|Heart.lastCycle|_require2.Heart.lastCycle), lastEpoch: (heart.lastEpoch|Heart.lastEpoch|_require2.Heart.lastEpoch), personality: (heart.personality|Heart.personality|_require2.Heart.personality), currentCycle: (heart.currentCycle|Heart.currentCycle|_require2.Heart.currentCycle), currentEpoch: (heart.currentEpoch|Heart.currentEpoch|_require2.Heart.currentEpoch), startDate: (heart.startDate|Heart.startDate|_require2.Heart.startDate)}}}
 */
function getNodeStats(node) {
    var _node$opts = node.opts,
        cycleInterval = _node$opts.cycleInterval,
        epochInterval = _node$opts.epochInterval,
        beatInterval = _node$opts.beatInterval,
        dataPath = _node$opts.dataPath,
        port = _node$opts.port,
        apiPort = _node$opts.apiPort,
        IRIPort = _node$opts.IRIPort,
        TCPPort = _node$opts.TCPPort,
        UDPPort = _node$opts.UDPPort,
        isMaster = _node$opts.isMaster,
        IRIProtocol = _node$opts.IRIProtocol,
        temporary = _node$opts.temporary;
    var _node$heart = node.heart,
        lastCycle = _node$heart.lastCycle,
        lastEpoch = _node$heart.lastEpoch,
        personality = _node$heart.personality,
        currentCycle = _node$heart.currentCycle,
        currentEpoch = _node$heart.currentEpoch,
        startDate = _node$heart.startDate;

    var totalPeers = node.list.all().length;
    var isIRIHealthy = node.iri && node.iri.isHealthy;
    var iriStats = node.iri && node.iri.iriStats;
    var connectedPeers = Array.from(node.sockets.keys()).filter(function (p) {
        return node.sockets.get(p).readyState === 1;
    }).map(getPeerStats);

    return {
        name: node.opts.name,
        version: version,
        ready: node._ready,
        isIRIHealthy: isIRIHealthy,
        iriStats: iriStats,
        peerStats: getSummary(node),
        totalPeers: totalPeers,
        connectedPeers: connectedPeers,
        config: {
            cycleInterval: cycleInterval,
            epochInterval: epochInterval,
            beatInterval: beatInterval,
            dataPath: dataPath,
            port: port,
            apiPort: apiPort,
            IRIPort: IRIPort,
            TCPPort: TCPPort,
            UDPPort: UDPPort,
            IRIProtocol: IRIProtocol,
            isMaster: isMaster,
            temporary: temporary
        },
        heart: {
            lastCycle: lastCycle,
            lastEpoch: lastEpoch,
            personality: personality,
            currentCycle: currentCycle,
            currentEpoch: currentEpoch,
            startDate: startDate
        }
    };
}

module.exports = {
    getSummary: getSummary,
    getNodeStats: getNodeStats
};