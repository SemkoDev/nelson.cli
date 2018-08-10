const { spawnMockedNetwork } = require('../network');
const { DEFAULT_OPTIONS } = require('../../node/node');

describe('Node Network', () => {
    it('should run correctly', (done) => {
        const onError = () => { throw new Error('A node exited for some reason...'); };
        const network = spawnMockedNetwork({ onError, silent: true });
        process.on('SIGINT', network.end);
        process.on('SIGTERM', network.end);
        setTimeout(() => {
            network.end().then(() => {
                const stats = Object.values(network.getStats());
                const connections = stats.filter(s => !s.isMaster).map(s => s.connections.connected);
                const allConnections = stats.map(s => s.connections.connected);
                const peers = stats.filter(s => !s.isMaster).map(s => s.peers.length);

                // All normal nodes should be connected to at least one neighbor
                expect(connections.filter(n => n < 1)).toHaveLength(0);
                // All nodes should respect the maximal neighbors settings.
                expect(allConnections.filter(n => n > DEFAULT_OPTIONS.incomingMax + DEFAULT_OPTIONS.outgoingMax + 1))
                    .toHaveLength(0);
                // All nodes should have a considerable amount of peers in their DB.
                expect(peers.filter(n => n < 40)).toHaveLength(0);
                done();
            });
        }, 390000)
    }, 400000);
});
