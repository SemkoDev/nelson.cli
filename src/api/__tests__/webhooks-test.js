const express = require('express');
const bodyParser = require('body-parser');
const { Node } = require('../../node/node');
const { startWebhooks } = require('../webhooks');

jest.mock('../../node/iri');

const API_DATA = [
    'config', 'connectedPeers', 'heart', 'iriStats', 'isIRIHealthy', 'name', 'peerStats', 'ready',
    'totalPeers','version'
];

describe('API Webhooks', () => {
    it('should start webhooks correctly', (done) => {
        const node = new Node({ silent: true, temporary: true, port: 16609 });
        node.start().then(() => {
            const startDate = new Date();
            const hook = startWebhooks(node, [ 'http://localhost:12348' ], 2);
            const app = express();
            app.use(bodyParser.urlencoded({ extended: false }));
            app.use(bodyParser.json());

            const server = app.listen(12348);
            app.post('/', (req) => {
                const timePassed = (new Date()) - startDate;
                const keys = Object.keys(req.body);
                keys.sort();
                expect(keys).toEqual(API_DATA);
                expect(timePassed).toBeGreaterThanOrEqual(2000);
                expect(timePassed).toBeLessThanOrEqual(2100);
                server.close();
                hook.stop();
                node.end().then(done);
            });
        })
    });
});
