const { Node } = require('../../node/node');
const { getSummary, getNodeStats } = require('../node');

jest.mock('../../node/iri');

const ALLOWED_DATA = [
    'config', 'connectedPeers', 'heart', 'iriStats', 'isIRIHealthy',
    'name', 'peerStats', 'ready', 'totalPeers', 'version'
];

describe('API Node utils', () => {
   it('should correctly return summary', (done) => {
       const node = new Node({ silent: true, temporary: true, port: 16607 });
       node.start().then(() => {
           const summary = getSummary(node);
           expect(summary.newNodes).toBeTruthy;
           expect(summary.activeNodes).toBeTruthy;
           node.end().then(done)
       })
   });

   it('should correctly return node stats', (done) => {
       const node = new Node({ silent: true, temporary: true, port: 16608 });
       node.start().then(() => {
           const stats = getNodeStats(node);
           const keys =  Object.keys(stats);
           keys.sort();
           expect(keys).toEqual(ALLOWED_DATA);
           node.end().then(done)
       })
   })
});
