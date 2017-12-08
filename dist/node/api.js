"use strict";

var http = require('http');

function createAPI(node) {
    var server = http.createServer(function (req, res) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(getNodeStats(node), null, 4));
    });
    server.listen(node.opts.apiPort, '127.0.0.1');
}

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
        temporary = _node$opts.temporary;
    var _node$heart = node.heart,
        lastCycle = _node$heart.lastCycle,
        lastEpoch = _node$heart.lastEpoch,
        personality = _node$heart.personality,
        currentCycle = _node$heart.currentCycle,
        currentEpoch = _node$heart.currentEpoch,
        startDate = _node$heart.startDate;

    var totalPeers = node.list.all().length;
    var connectedPeers = Array.from(node.sockets.keys()).filter(function (p) {
        return node.sockets.get(p).readyState === 1;
    }).map(function (p) {
        return p.data;
    });

    return {
        ready: node._ready,
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
    createAPI: createAPI,
    getNodeStats: getNodeStats
};