const {Peer} = require('../../node/peer');
const {getPeerStats} = require('../peer');

const ALLOWED_DATA = [
    'IRIProtocol', 'TCPPort', 'UDPPort', 'connected', 'dateCreated', 'dateLastConnected', 'dateTried',
    'hostname', 'ip', 'isTrusted', 'lastConnections', 'name', 'port', 'protocol', 'seen', 'tried', 'weight'
];

describe('API Peer utils', () => {
    it('should display only public data', () => {
        const stats = getPeerStats(new Peer());
        const keys = Object.keys(stats);
        keys.sort();
        expect(keys).toEqual(ALLOWED_DATA);
    })
});
