const dns = require('dns');
const { PeerList } = require('../peer-list');

describe('PeerTest', () => {
    it('should create a list correctly', (done) => {
        const list = new PeerList({ temporary: true });
        list.load([
            'somehost.com/1234/345/567', '122.232.223.0/14265/11111/22222'
        ]).then(() => {
            expect(list.peers).toHaveLength(2);
            expect(list.peers.map((p) => p.data.hostname).sort()).toEqual(['somehost.com', '122.232.223.0'].sort());
            expect(list.peers.map((p) => p.data.port).sort()).toEqual([1234, 14265].sort());
            done();
        });
    });

    it('should add to a list correctly', (done) => {
        const list = new PeerList({ temporary: true });
        list.load([
            'somehost.com/1234/345/567', '122.232.223.0/14265/11111/22222'
        ]).then(() => {
            expect(list.peers).toHaveLength(2);
            expect(list.peers.map((p) => p.data.hostname).sort()).toEqual(['somehost.com', '122.232.223.0'].sort());
            list.add({
                hostname: 'some-other-peer.org',
                port: 334,
                TCPPort: 335,
                UDPPort: 336
            }).then(() => {
                expect(list.peers.map((p) => p.data.hostname).sort()).toEqual([
                    'somehost.com',
                    '122.232.223.0',
                    'some-other-peer.org'
                ].sort());
                expect(list.peers.map((p) => p.data.port).sort()).toEqual([334, 1234, 14265].sort());
                done();
            })
        });
    });

    it('should update the list correctly', (done) => {
        const list = new PeerList({ temporary: true });
        list.load([
            'somehost.com/1234/345/567', '122.232.223.0/14265/11111/22222'
        ]).then(() => {
            list.add({
                hostname: 'somehost.com',
                port: 1234,
                TCPPort: 666,
                UDPPort: 777
            }).then(() => {
                expect(list.peers).toHaveLength(2);
                expect(list.all().sort()[1].data.TCPPort).toEqual(666);
                done();
            });
        });
    });

    it('should update the list correctly by key', (done) => {
        const list = new PeerList({ temporary: true });
        list.load([
            'somehost.com/1234/345/567', '122.232.223.0/14265/11111/22222'
        ]).then(() => {
            list.add({
                hostname: 'somehost.com',
                port: 1234,
                TCPPort: 666,
                UDPPort: 777,
                remoteKey: '213213'
            }).then(() => {
                list.add({
                    hostname: 'someanotherhost.com',
                    port: 1234,
                    TCPPort: 668,
                    UDPPort: 777,
                    remoteKey: '213213'
                }).then(() => {
                    expect(list.peers).toHaveLength(2);
                    expect(list.all().sort()[1].data.TCPPort).toEqual(668);
                    done();
                });
            });
        });
    });

    it('should add to the list correctly, same host, when multiPort allowed', (done) => {
        const list = new PeerList({ temporary: true, multiPort: true });
        list.load([
            'somehost.com/1234/345/567', '122.232.223.0/14265/11111/22222'
        ]).then(() => {
            list.add({
                hostname: 'somehost.com',
                port: 12345,
                TCPPort: 333,
                UDPPort: 444
            }).then(() => {
                expect(list.peers).toHaveLength(3);
                expect(list.all()[0].data.port).toEqual(1234);
                expect(list.all()[2].data.port).toEqual(12345);
                done();
            });
        });
    });

    it('should update a peer correctly', (done) => {
        const list = new PeerList({ temporary: true });
        list.load([
            'somehost.com/1234/345/567', '122.232.223.0/14265/11111/22222'
        ]).then(() => {
            const peer = list.all()[1];
            const data = { ...peer.data, port: 6789 };
            list.update(peer, { port: 6789 }).then(() => {
                expect(list.all()[1].data).toEqual(data);
                done();
            });
        });
    });

    it('should find in list correctly', (done) => {
        const list = new PeerList({ temporary: true });
        list.load([
            'somehost.com/1234/345/567', '122.232.223.0/14265/11111/22222'
        ]).then(() => {
            list.findByAddress('somehost.com', 2345).then((peers) => {
                expect(peers).toHaveLength(1);
                done();
            })
        });
    });

    it('should not find in list correctly, multiPort + different ports', (done) => {
        const list = new PeerList({ temporary: true, multiPort: true });
        list.load([
            'somehost.com/1234/345/567', '122.232.223.0/14265/11111/22222'
        ]).then(() => {
            list.findByAddress('somehost.com', 2345).then((peers) => {
                expect(peers).toHaveLength(0);
                done();
            })
        });
    });

    it('should find in list correctly by using IP', (done) => {
        const list = new PeerList({ temporary: true, multiPort: false });
        list.load([
            'carriota.com/1234/345/567', '122.232.223.0/14265/11111/22222', 'iota.org/123/345/546'
        ]).then(() => {
            Promise.all(list.peers.map((p) => p.getIP())).then(() => {
                dns.resolve('carriota.com', 'A', (error, results) => {
                    const ip = error || !results.length ? null : results[0];
                    if (ip) {
                        list.findByAddress(ip, 2345).then((peers) => {
                            expect(peers).toHaveLength(1);
                            done();
                        })
                    } else {
                        done();
                    }
                });
            });
        });
    });
});
