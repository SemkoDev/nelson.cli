const request = require('request');
const { Node } = require('../../node/node');
const { createAPI } = require('../index');

jest.mock('../../node/iri');

const API_DATA = [
    'config', 'connectedPeers', 'heart', 'iriStats', 'isIRIHealthy', 'name', 'peerStats', 'ready',
    'totalPeers','version'
];

describe('API', () => {
    it('should get node info correctly', (done) => {
        const node = new Node({ silent: true, temporary: true, port: 16601 });
        const server = createAPI({
            node,
            apiPort: 12345,
            apiHostname: 'localhost'
        });
        node.start().then(() => {
            request.get('http://localhost:12345/', (err, resp, body) => {
                const answer = JSON.parse(body);
                const keys = Object.keys(answer);
                keys.sort();
                expect(keys).toEqual(API_DATA);
                server.close();
                node.end().then(done);
            });
        })
    });

    it('should deny public access to protected when no password set', (done) => {
        const node = new Node({ silent: true, temporary: true, port: 16602 });
        const server = createAPI({
            node,
            apiPort: 12345,
            apiHostname: 'localhost',
            username: 'pass',
            password: 'pass'
        });
        node.start().then(() => {
            request.get('http://localhost:12345/', (err, resp, body) => {
                expect(resp.statusCode).toEqual(401);
                expect(body).toBeFalsy;
                server.close();
                node.end().then(done);
            });
        })
    });

    it('should deny public access to protected when wrong pass', (done) => {
        const node = new Node({ silent: true, temporary: true, port: 16603 });
        const server = createAPI({
            node,
            apiPort: 12345,
            apiHostname: 'localhost',
            username: 'pass',
            password: 'pass'
        });
        node.start().then(() => {
            request.get({
                url: 'http://localhost:12345/',
                auth: {
                    user: 'pass',
                    pass: 'nopass'
                }
            }, (err, resp, body) => {
                expect(resp.statusCode).toEqual(401);
                expect(body).toBeFalsy;
                server.close();
                node.end().then(done);
            });
        })
    });

    it('should allow access to protected when auth ok', (done) => {
        const node = new Node({ silent: true, temporary: true, port: 16604 });
        const server = createAPI({
            node,
            apiPort: 12345,
            apiHostname: 'localhost',
            username: 'pass',
            password: 'pass'
        });
        node.start().then(() => {
            request.get({
                url: 'http://localhost:12345/',
                auth: {
                    user: 'pass',
                    pass: 'pass'
                }
            }, (err, resp, body) => {
                const answer = JSON.parse(body);
                const keys = Object.keys(answer);
                keys.sort();
                expect(keys).toEqual(API_DATA);
                server.close();
                node.end().then(done);
            });
        })
    });

    it('should get peer stats info correctly', (done) => {
        const node = new Node({ silent: true, temporary: true, port: 16605 });
        const server = createAPI({
            node,
            apiPort: 12346,
            apiHostname: 'localhost'
        });
        node.start().then(() => {
            request.get('http://localhost:12346/peer-stats', (err, resp, body) => {
                const summary = JSON.parse(body);
                expect(summary.newNodes).toBeTruthy;
                expect(summary.activeNodes).toBeTruthy;
                server.close();
                node.end().then(done);
            });
        })
    });

    it('should get peers info correctly', (done) => {
        const node = new Node({ silent: true, temporary: true, port: 16606 });
        const server = createAPI({
            node,
            apiPort: 12347,
            apiHostname: 'localhost'
        });
        node.start().then(() => {
            request.get('http://localhost:12347/peers', (err, resp, body) => {
                const peers = JSON.parse(body);
                expect(Array.isArray(peers)).toBeTruthy;
                server.close();
                node.end().then(done);
            });
        })
    });
});
