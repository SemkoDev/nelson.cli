const dns = require("dns");
const { Peer, DEFAULT_PEER_DATA } = require("../peer");

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

describe("Peer", () => {
    it("should add default peer data", () => {
        const peer = new Peer();
        expect(peer.data).toEqual(DEFAULT_PEER_DATA);
    });

    it("should add non-default data to peer", () => {
        const peer = new Peer({ hostname: "tangle.com", port: 666 });
        expect(peer.data.hostname).toEqual("tangle.com");
        expect(peer.data.port).toEqual(666);
    });

    it("should return correct tcp, http and hostname strings", () => {
        const peer = new Peer({
            hostname: "tangle.com",
            port: 666,
            TCPPort: 777,
            UDPPort: 888
        });
        expect(peer.getTCPURI()).toEqual("tcp://tangle.com:777");
        expect(peer.getUDPURI()).toEqual("udp://tangle.com:888");
        expect(peer.getNelsonURI()).toEqual("http://tangle.com:666");
        expect(peer.getNelsonWebsocketURI()).toEqual("ws://tangle.com:666");
        expect(peer.getHostname()).toEqual("tangle.com/666/777/888/0/udp");
    });

    it("should update the peer data", () => {
        const peer = new Peer({ hostname: "tangle.com", port: 666 });
        expect(peer.data.hostname).toEqual("tangle.com");
        peer.update({ hostname: "iota.org" });
        expect(peer.data.hostname).toEqual("iota.org");
        expect(peer.data.port).toEqual(666);
    });

    it("should reset IP if hostname changed", () => {
        const peer = new Peer({
            hostname: "tangle.com",
            port: 666,
            ip: "123.123.123.123"
        });
        expect(peer.data.ip).toEqual("123.123.123.123");
        peer.update({ hostname: "iota.org" });
        expect(peer.data.ip).toEqual(null);
    });

    it("should return a resolved ip if hostname is an ip", done => {
        const peer = new Peer({ hostname: "192.168.0.1", port: 666 });
        peer.getIP().then(ip => {
            expect(ip).toEqual("192.168.0.1");
            done();
        });
    });

    it("should return a resolved ip if hostname is not an ip", done => {
        const peer = new Peer({ hostname: "deviota.com", port: 666 });
        dns.resolve(peer.data.hostname, "A", (error, results) => {
            peer.getIP().then(ip => {
                expect(ip).toEqual(results[0]);
                done();
            });
        });
    });

    it("should compare an ip-hostname correctly", done => {
        const peer = new Peer({ hostname: "192.168.0.1", port: 666 });
        peer.isSameIP("192.168.0.1").then(result => {
            expect(result).toBeTruthy;
            done();
        });
    });

    it("should compare an ip-hostname correctly #2", done => {
        const peer = new Peer({ hostname: "192.168.0.1", port: 666 });
        peer.isSameIP("192.168.0.2").then(result => {
            expect(result).toBeFalsy;
            done();
        });
    });

    it("should compare a hostname and ip correctly", done => {
        const peer = new Peer({ hostname: "deviota.com", port: 666 });
        dns.resolve(peer.data.hostname, "A", (error, results) => {
            peer.isSameIP(results[0]).then(result => {
                expect(result).toBeTruthy;
                done();
            });
        });
    });

    it(
        "should record connection data",
        done => {
            const peer = new Peer({
                hostname: "tangle.com",
                port: 666,
                TCPPort: 777,
                UDPPort: 888
            });
            recordPeerConnection(peer, 3).then(() => {
                expect(peer.data.lastConnections).toHaveLength(1);
                done();
            });
        },
        4000
    );

    it(
        "should record multiple connection data",
        done => {
            const peer = new Peer({
                hostname: "tangle.com",
                port: 666,
                TCPPort: 777,
                UDPPort: 888
            });
            const durations = [1, 4, 2];
            const datas = [null, null, null];
            recordPeerConnections(peer, durations, datas).then(() => {
                expect(peer.data.lastConnections).toHaveLength(3);
                done();
            });
        },
        8000
    );

    it("should mark a peer as lazy", done => {
        const peer = new Peer(
            { hostname: "tangle.com", port: 666, TCPPort: 777, UDPPort: 888 },
            {
                lazyLimit: 3
            }
        );
        peer.markConnected().then(() => {
            peer.updateConnection({
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            });
            setTimeout(() => {
                expect(peer.isLazy()).toBeFalsy;
                setTimeout(() => {
                    expect(peer.isLazy()).toBeTruthy;
                    done();
                }, 2100);
            }, 1000);
        });
    });

    it("should correctly calculate quality #1", done => {
        const peer = new Peer({
            hostname: "tangle.com",
            port: 666,
            TCPPort: 777,
            UDPPort: 888
        });
        const durations = [1, 1, 1];
        const datas = [
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            },
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            },
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            }
        ];
        recordPeerConnections(peer, durations, datas).then(() => {
            expect(peer.getPeerQuality()).toBeCloseTo(0.3333, 4);
            done();
        });
    });

    it("should correctly calculate quality #2", done => {
        const peer = new Peer({
            hostname: "tangle.com",
            port: 666,
            TCPPort: 777,
            UDPPort: 888
        });
        const durations = [1, 1];
        const datas = [
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            },
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            }
        ];
        recordPeerConnections(peer, durations, datas).then(() => {
            expect(peer.getPeerQuality()).toBeCloseTo(1.0, 4);
            done();
        });
    });

    it("should correctly calculate quality #3", done => {
        const peer = new Peer({
            hostname: "tangle.com",
            port: 666,
            TCPPort: 777,
            UDPPort: 888
        });
        const durations = [1, 1, 1, 1, 1];
        const datas = [
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            },
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            },
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            },
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            },
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            }
        ];
        recordPeerConnections(peer, durations, datas).then(() => {
            expect(peer.getPeerQuality()).toBeCloseTo(0.2, 4);
            done();
        });
    });

    it("should correctly calculate quality #4", done => {
        const peer = new Peer({
            hostname: "tangle.com",
            port: 666,
            TCPPort: 777,
            UDPPort: 888
        });
        const durations = [1, 1, 1, 1, 1];
        const datas = [
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            },
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            },
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            },
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 0,
                numberOfInvalidTransactions: 0
            },
            {
                numberOfAllTransactions: 0,
                numberOfRandomTransactionRequests: 0,
                numberOfNewTransactions: 10,
                numberOfInvalidTransactions: 2
            }
        ];
        recordPeerConnections(peer, durations, datas).then(() => {
            expect(peer.getPeerQuality()).toBeCloseTo(1, 4);
            done();
        });
    });
});

function recordPeerConnections(peer, durations, datas) {
    expect(durations.length).toEqual(datas.length);
    return durations.reduce(
        (promise, duration, index) =>
            promise.then(() =>
                recordPeerConnection(peer, duration, datas[index])
            ),
        Promise.resolve()
    );
}

function recordPeerConnection(peer, duration, data) {
    return new Promise(resolve => {
        peer.markConnected().then(() => {
            peer.updateConnection(
                data || {
                    numberOfAllTransactions: 0,
                    numberOfRandomTransactionRequests: 0,
                    numberOfNewTransactions: 0,
                    numberOfInvalidTransactions: 0
                }
            );
            setTimeout(() => {
                expect(peer.getConnectionDuration()).toBeCloseTo(duration, 1);
                peer.markDisconnected().then(() => {
                    resolve(peer);
                });
            }, duration * 1000);
        });
    });
}
