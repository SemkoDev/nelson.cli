/**
 * Returns a clean Peer object that can be used in the API
 * @param {Peer} peer
 * @returns {{name, hostname, ip, port, TCPPort, UDPPort, protocol, IRIProtocol, seen, connected, tried, weight, dateTried, dateLastConnected, dateCreated, isTrusted, lastConnections}}
 */
function getPeerStats (peer) {
    const {
        name,
        hostname,
        ip,
        port,
        TCPPort,
        UDPPort,
        protocol,
        seen,
        connected,
        tried,
        weight,
        dateTried,
        dateLastConnected,
        dateCreated,
        IRIProtocol,
        isTrusted,
        lastConnections
    } = peer.data;
    return {
        name,
        hostname,
        ip,
        port,
        TCPPort,
        UDPPort,
        protocol,
        IRIProtocol,
        seen,
        connected,
        tried,
        weight,
        dateTried,
        dateLastConnected,
        dateCreated,
        isTrusted,
        lastConnections
    }
}

module.exports = {
    getPeerStats
};
