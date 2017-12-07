const dns = require('dns');
const { Peer, DEFAULT_PEER_DATA } = require('../peer');

describe('Peer', () => {
    it('should add default peer data', () => {
        const peer = new Peer();
        expect(peer.data).toEqual(DEFAULT_PEER_DATA);
    });

    it('should add non-default data to peer', () => {
        const peer = new Peer({ hostname: 'tangle.com', port: 666 });
        expect(peer.data.hostname).toEqual('tangle.com');
        expect(peer.data.port).toEqual(666);
    });

    it('should return correct tcp, http and hostname strings', () => {
        const peer = new Peer({ hostname: 'tangle.com', port: 666, TCPPort: 777, UDPPort: 888 });
        expect(peer.getTCPURI()).toEqual('tcp://tangle.com:777');
        expect(peer.getUDPURI()).toEqual('udp://tangle.com:888');
        expect(peer.getNelsonURI()).toEqual('http://tangle.com:666');
        expect(peer.getHostname()).toEqual('tangle.com/666/777/888');
    });

    it('should update the peer data', () => {
        const peer = new Peer({ hostname: 'tangle.com', port: 666 });
        expect(peer.data.hostname).toEqual('tangle.com');
        peer.update({ hostname: 'iota.org'});
        expect(peer.data.hostname).toEqual('iota.org');
        expect(peer.data.port).toEqual(666);
    });

    it('should reset IP if hostname changed', () => {
        const peer = new Peer({ hostname: 'tangle.com', port: 666, ip: '123.123.123.123' });
        expect(peer.data.ip).toEqual('123.123.123.123');
        peer.update({ hostname: 'iota.org'});
        expect(peer.data.ip).toEqual(null);
    });

    it('should return a resolved ip if hostname is an ip', (done) => {
        const peer = new Peer({ hostname: '192.168.0.1', port: 666 });
        peer.getIP().then((ip) => {
            expect(ip).toEqual('192.168.0.1');
            done();
        })
    });

    it('should return a resolved ip if hostname is not an ip', (done) => {
        const peer = new Peer({ hostname: 'carriota.com', port: 666 });
        dns.resolve(peer.data.hostname, 'A', (error, results) => {
            peer.getIP().then((ip) => {
                expect(ip).toEqual(results[0]);
                done();
            })
        });
    });

    it('should compare an ip-hostname correctly', (done) => {
        const peer = new Peer({ hostname: '192.168.0.1', port: 666 });
        peer.isSameIP('192.168.0.1').then((result) => {
            expect(result).toBeTruthy;
            done();
        });
    });

    it('should compare an ip-hostname correctly #2', (done) => {
        const peer = new Peer({ hostname: '192.168.0.1', port: 666 });
        peer.isSameIP('192.168.0.2').then((result) => {
            expect(result).toBeFalsy;
            done();
        });
    });

    it('should compare a hostname and ip correctly', (done) => {
        const peer = new Peer({ hostname: 'carriota.com', port: 666 });
        dns.resolve(peer.data.hostname, 'A', (error, results) => {
            peer.isSameIP(results[0]).then((result) => {
                expect(result).toBeTruthy;
                done();
            })
        });
    });
});
