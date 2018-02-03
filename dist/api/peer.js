"use strict";

/**
 * Returns a clean Peer object that can be used in the API
 * @param {Peer} peer
 * @returns {{name, hostname, ip, port, TCPPort, UDPPort, protocol, IRIProtocol, seen, connected, tried, weight, dateTried, dateLastConnected, dateCreated, isTrusted, lastConnections}}
 */
function getPeerStats(peer) {
    var _peer$data = peer.data,
        name = _peer$data.name,
        hostname = _peer$data.hostname,
        ip = _peer$data.ip,
        port = _peer$data.port,
        TCPPort = _peer$data.TCPPort,
        UDPPort = _peer$data.UDPPort,
        protocol = _peer$data.protocol,
        seen = _peer$data.seen,
        connected = _peer$data.connected,
        tried = _peer$data.tried,
        weight = _peer$data.weight,
        dateTried = _peer$data.dateTried,
        dateLastConnected = _peer$data.dateLastConnected,
        dateCreated = _peer$data.dateCreated,
        IRIProtocol = _peer$data.IRIProtocol,
        isTrusted = _peer$data.isTrusted,
        lastConnections = _peer$data.lastConnections;

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
}

module.exports = {
    getPeerStats: getPeerStats
};