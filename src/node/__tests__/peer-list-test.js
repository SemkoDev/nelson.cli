const dns = require("dns");
const { PeerList } = require("../peer-list");

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

describe("PeerListTest", () => {
    it("should create a list correctly", done => {
        const list = new PeerList({ temporary: true, silent: true });
        list.load([
            "somehost.com/1234/345/567",
            "122.232.223.0/14265/11111/22222"
        ]).then(() => {
            expect(list.peers[0].data.key).toBeTruthy;
            expect(list.peers[1].data.key).toBeTruthy;
            expect(list.peers).toHaveLength(2);
            expect(list.peers.map(p => p.data.hostname).sort()).toEqual(
                ["somehost.com", "122.232.223.0"].sort()
            );
            expect(list.peers.map(p => p.data.port).sort()).toEqual(
                [1234, 14265].sort()
            );
            done();
        });
    });

    it("should add to a list correctly", done => {
        const list = new PeerList({ temporary: true, silent: true });
        list.load([
            "somehost.com/1234/345/567",
            "122.232.223.0/14265/11111/22222"
        ]).then(() => {
            expect(list.peers).toHaveLength(2);
            expect(list.peers.map(p => p.data.hostname).sort()).toEqual(
                ["somehost.com", "122.232.223.0"].sort()
            );
            list.add({
                hostname: "some-other-peer.org",
                port: 334,
                TCPPort: 335,
                UDPPort: 336
            }).then(() => {
                expect(list.peers[0].data.key).toBeTruthy;
                expect(list.peers[1].data.key).toBeTruthy;
                expect(list.peers[2].data.key).toBeTruthy;
                expect(list.peers.map(p => p.data.hostname).sort()).toEqual(
                    [
                        "somehost.com",
                        "122.232.223.0",
                        "some-other-peer.org"
                    ].sort()
                );
                expect(list.peers.map(p => p.data.port).sort()).toEqual(
                    [334, 1234, 14265].sort()
                );
                done();
            });
        });
    });

    it("should return all peers", done => {
        const list = new PeerList({ temporary: true, silent: true });
        list.load([
            "somehost.com/1234/345/567",
            "122.232.223.0/14265/11111/22222"
        ]).then(() => {
            expect(list.all()).toHaveLength(2);
            done();
        });
    });

    it("should return average age correctly", done => {
        const list = new PeerList({ temporary: true, silent: true });
        list.load([
            "somehost.com/1234/345/567",
            "122.232.223.0/14265/11111/22222"
        ]).then(() => {
            setTimeout(() => {
                list.add({
                    hostname: "somehost2.com",
                    port: 1234,
                    TCPPort: 666,
                    UDPPort: 777
                }).then(() => {
                    expect(list.peers).toHaveLength(3);
                    expect(list.getAverageAge()).toBeGreaterThan(2.6);
                    done();
                });
            }, 4000);
        });
    });

    it("should update the list correctly", done => {
        const list = new PeerList({ temporary: true, silent: true });
        list.load([
            "somehost.com/1234/345/567",
            "122.232.223.0/14265/11111/22222"
        ]).then(() => {
            list.add({
                hostname: "somehost.com",
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

    it("should update the list correctly by key", done => {
        const list = new PeerList({ temporary: true, silent: true });
        list.load([
            "somehost.com/1234/345/567",
            "122.232.223.0/14265/11111/22222"
        ]).then(() => {
            list.add({
                hostname: "somehost.com",
                port: 1234,
                TCPPort: 666,
                UDPPort: 777,
                remoteKey: "213213"
            }).then(() => {
                list.add({
                    hostname: "someanotherhost.com",
                    port: 1234,
                    TCPPort: 668,
                    UDPPort: 777,
                    remoteKey: "213213"
                }).then(() => {
                    expect(list.peers).toHaveLength(2);
                    expect(list.all().sort()[1].data.TCPPort).toEqual(668);
                    done();
                });
            });
        });
    });

    it("should add to the list correctly, same host, when multiPort allowed", done => {
        const list = new PeerList({
            temporary: true,
            multiPort: true,
            silent: true
        });
        list.load([
            "somehost.com/1234/345/567",
            "122.232.223.0/14265/11111/22222"
        ]).then(() => {
            list.add({
                hostname: "somehost.com",
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

    it("should update a peer correctly", done => {
        const list = new PeerList({ temporary: true, silent: true });
        list.load([
            "somehost.com/1234/345/567",
            "122.232.223.0/14265/11111/22222"
        ]).then(() => {
            const peer = list.all()[1];
            const data = { ...peer.data, port: 6789 };
            list.update(peer, { port: 6789 }).then(() => {
                expect(list.all()[1].data).toEqual(data);
                done();
            });
        });
    });

    it("should find in list correctly", done => {
        const list = new PeerList({ temporary: true, silent: true });
        list.load([
            "somehost.com/1234/345/567",
            "122.232.223.0/14265/11111/22222"
        ]).then(() => {
            list.findByAddress("somehost.com", 2345).then(peers => {
                expect(peers).toHaveLength(1);
                done();
            });
        });
    });

    it("should find in list with unknown remote key, but existing address", done => {
        const list = new PeerList({ temporary: true, silent: true });
        list.load([
            "somehost.com/1234/345/567",
            "122.232.223.0/14265/11111/22222"
        ]).then(() => {
            list.findByRemoteKeyOrAddress("abcdef", "somehost.com", 2345).then(
                peers => {
                    expect(peers).toHaveLength(1);
                    done();
                }
            );
        });
    });

    it("should find in list with known remote key, but unknown address", done => {
        const list = new PeerList({ temporary: true, silent: true });
        list.add({
            hostname: "somehost.com",
            port: 12345,
            TCPPort: 333,
            UDPPort: 444,
            remoteKey: "abcdef"
        }).then(() => {
            list.findByRemoteKeyOrAddress(
                "abcdef",
                "unknownhost.com",
                2345
            ).then(peers => {
                expect(peers).toHaveLength(1);
                expect(peers[0].data.hostname).toEqual(
                    list.all()[0].data.hostname
                );
                done();
            });
        });
    });

    it("should not find in list with unknown remote key and address", done => {
        const list = new PeerList({ temporary: true, silent: true });
        list.add({
            hostname: "somehost.com",
            port: 12345,
            TCPPort: 333,
            UDPPort: 444,
            remoteKey: "abcdef"
        }).then(() => {
            list.findByRemoteKeyOrAddress("xyz", "unknownhost.com", 2345).then(
                peers => {
                    expect(peers).toHaveLength(0);
                    done();
                }
            );
        });
    });

    it("should not find in list correctly, multiPort + different ports", done => {
        const list = new PeerList({
            temporary: true,
            multiPort: true,
            silent: true
        });
        list.load([
            "somehost.com/1234/345/567",
            "122.232.223.0/14265/11111/22222"
        ]).then(() => {
            list.findByAddress("somehost.com", 2345).then(peers => {
                expect(peers).toHaveLength(0);
                done();
            });
        });
    });

    it("should find in list correctly by using IP", done => {
        const list = new PeerList({
            temporary: true,
            multiPort: false,
            silent: true
        });
        list.load([
            "carriota.com/1234/345/567",
            "122.232.223.0/14265/11111/22222",
            "iota.org/123/345/546"
        ]).then(() => {
            Promise.all(list.peers.map(p => p.getIP())).then(() => {
                dns.resolve("carriota.com", "A", (error, results) => {
                    const ip = error || !results.length ? null : results[0];
                    if (ip) {
                        list.findByAddress(ip, 2345).then(peers => {
                            expect(peers).toHaveLength(1);
                            done();
                        });
                    } else {
                        done();
                    }
                });
            });
        });
    });

    it("should return correct peer trusts", done => {
        const list = new PeerList({
            temporary: true,
            ageNormalizer: 60,
            silent: true
        });
        list.load([
            "somehost.com/1234/345/567",
            "122.232.223.0/14265/11111/22222"
        ]).then(() => {
            setTimeout(() => {
                list.add({
                    hostname: "some-other-peer.org",
                    port: 334,
                    TCPPort: 335,
                    UDPPort: 336
                }).then(() => {
                    setTimeout(() => {
                        list.add({
                            hostname: "some-other-peer2.org",
                            port: 334,
                            TCPPort: 335,
                            UDPPort: 336
                        }).then(() => {
                            expect(
                                list.getPeerTrust(list.peers[0])
                            ).toBeGreaterThan(0.5);
                            expect(
                                list.getPeerTrust(list.peers[1])
                            ).toBeGreaterThan(0.5);
                            expect(
                                list.getPeerTrust(list.peers[2])
                            ).toBeGreaterThan(0.0001);
                            expect(
                                list.getPeerTrust(list.peers[2])
                            ).toBeLessThan(0.01);
                            expect(
                                list.getPeerTrust(list.peers[3])
                            ).toBeGreaterThanOrEqual(0.0001);
                            expect(
                                list.getPeerTrust(list.peers[3])
                            ).toBeLessThan(0.001);
                            done();
                        });
                    }, 1000);
                });
            }, 3000);
        });
    });

    it(
        "should return correct peer weights",
        done => {
            const list = new PeerList({
                temporary: true,
                ageNormalizer: 60,
                silent: true
            });
            list.load([
                "somehost.com/1234/345/567",
                "122.232.223.0/14265/11111/22222"
            ]).then(() => {
                setTimeout(() => {
                    list.add({
                        hostname: "some-other-peer.org",
                        port: 334,
                        TCPPort: 335,
                        UDPPort: 336
                    }).then(() => {
                        setTimeout(() => {
                            list.add({
                                hostname: "some-other-peer2.org",
                                port: 334,
                                TCPPort: 335,
                                UDPPort: 336
                            }).then(() => {
                                const weights = list
                                    .getWeighted()
                                    .map(w => w[1])
                                    .sort();
                                weights.reverse();
                                expect(weights[0]).toEqual(1);
                                expect(weights[1]).toEqual(1);
                                expect(weights[2]).toBeCloseTo(0.002, 3);
                                expect(weights[3]).toBeCloseTo(0.000075, 4);
                                done();
                            });
                        }, 3000);
                    });
                }, 3000);
            });
        },
        12000
    );
});
