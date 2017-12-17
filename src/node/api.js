const http = require('http');
const HttpDispatcher = require('httpdispatcher');

function createAPI (node) {
    const dispatcher = new HttpDispatcher();
    dispatcher.onGet('/', function(req, res) {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(getNodeStats(node), null, 4));
    });

    dispatcher.onGet('/peers', function(req, res) {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(node.list.all(), null, 4));
    });

    const server = http.createServer((request, response) => {
        try {
            dispatcher.dispatch(request, response);
        } catch(err) {
            console.log(err);
        }
    });
    server.listen(node.opts.apiPort, node.opts.apiHostname);
}

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
    const connectedPeers = Array.from(node.sockets.keys())
        .filter((p) => node.sockets.get(p).readyState === 1)
        .map((p) => p.data);

    return {
        ready: node._ready,
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
    createAPI,
    getNodeStats
};
