'use strict';

var http = require('http');
var request = require('request');
var HttpDispatcher = require('httpdispatcher');
var crypto = require('crypto');
var version = require('../../package.json').version;

/**
 * Creates an API interface for the Node. Accepts incoming connections.
 * Also, is able to make webhook calls.
 * @param {object} node
 * @param {string[]} webhooks
 * @param {number} interval
 */
function createAPI(node, webhooks) {
    var interval = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 30;

    var dispatcher = new HttpDispatcher();
    dispatcher.onGet('/', function (req, res) {
        res.writeHead(200, { "Content-Type": "application/json" });
        if (server.isLocalRequest(req)) {
            res.end(JSON.stringify(getNodeStats(node), null, 4));
        } else {
            res.end(JSON.stringify(getAnonymousNodeStats(node), null, 4));
        }
    });

    dispatcher.onGet('/peers', function (req, res) {
        res.writeHead(200, { "Content-Type": "application/json" });
        if (server.isLocalRequest(req)) {
            res.end(JSON.stringify(node.list.all(), null, 4));
        } else {
            res.end(JSON.stringify(getAnonymousNeigbourNodeStats(node.list), null, 4));
        }
    });

    dispatcher.onGet('/peer-stats', function (req, res) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(getSummary(node), null, 4));
    });

    var server = http.createServer(function (request, response) {
        // Set CORS headers
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Request-Method', '*');
        response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
        response.setHeader('Access-Control-Allow-Headers', '*');
        if (request.method === 'OPTIONS') {
            response.writeHead(200);
            response.end();
            return;
        }

        try {
            dispatcher.dispatch(request, response);
        } catch (err) {
            console.log(err);
        }
    });

    server.isLocalRequest = function (req) {
        var clientAddress = req.connection.remoteAddress || req.socket.remoteAddress;
        var serverAddress = server.address().address;

        return clientAddress === serverAddress;
    };

    server.listen(node.opts.apiPort, node.opts.apiHostname);

    if (webhooks && webhooks.length) {
        setInterval(function () {
            webhooks.forEach(function (uri) {
                return request({ uri: uri, method: 'POST', json: getNodeStats(node) }, function (err) {
                    if (err) {
                        node.log(('Webhook returned error: ' + uri).yellow);
                    }
                });
            });
        }, interval * 1000);
    }
}

function getAnonymousNeigbourNodeStats(nodeList) {
    nodeList.peers.map(function (peer) {
        if (peer.data.ip != null) {
            peer.data.ip = getMD5Hash(peer.data.ip.toString);
            peer.data.isAnonymous = true;
        }
    });
    return nodeList.peers;
}

function getAnonymousNodeStats(node) {
    var json = getNodeStats(node);
    json.connectedPeers.forEach(function (node) {
        if (node != null) {
            if (node.ip != null) {
                node.ip = getMD5Hash(node.ip.toString());
                node.isAnonymous = true;
            }
        }
    });
    return json;
}

function getMD5Hash(string) {
    return crypto.createHash('md5').update(string.toString()).digest('hex');
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
    }).map(function (p) {
        var _p$data = p.data,
            name = _p$data.name,
            hostname = _p$data.hostname,
            ip = _p$data.ip,
            port = _p$data.port,
            TCPPort = _p$data.TCPPort,
            UDPPort = _p$data.UDPPort,
            protocol = _p$data.protocol,
            seen = _p$data.seen,
            connected = _p$data.connected,
            tried = _p$data.tried,
            weight = _p$data.weight,
            dateTried = _p$data.dateTried,
            dateLastConnected = _p$data.dateLastConnected,
            dateCreated = _p$data.dateCreated,
            IRIProtocol = _p$data.IRIProtocol,
            isTrusted = _p$data.isTrusted,
            lastConnections = _p$data.lastConnections;

        return {
            name: name,
            hostname: hostname,
            ip: ip,
            port: port,
            TCPPort: TCPPort,
            UDPPort: UDPPort,
            protocol: protocol,
            IRIProtocol: IRIProtocol,
            seen: seen,
            connected: connected,
            tried: tried,
            weight: weight,
            dateTried: dateTried,
            dateLastConnected: dateLastConnected,
            dateCreated: dateCreated,
            isTrusted: isTrusted,
            lastConnections: lastConnections
        };
    });

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

module.exports = {
    createAPI: createAPI,
    getNodeStats: getNodeStats
};