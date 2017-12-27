const path = require('path');
const ip = require('ip');
const dns = require('dns');
const tmp = require('tmp');
const { URL } = require('url');
const weighted = require('weighted');
const Datastore = require('nedb');
const { Base } = require('./base');
const { Peer } = require('./peer');
const { DEFAULT_OPTIONS: DEFAULT_IRI_OPTIONS } = require('./iri');
const { getSecondsPassed, createIdentifier } = require('./tools/utils');

const DEFAULT_OPTIONS = {
    dataPath: path.join(process.cwd(), 'data/neighbors.db'),
    isMaster: false,
    multiPort: false,
    temporary: false,
    logIdent: 'LIST'
};

/**
 * A class that manages a list of peers and its persistence in the database
 * @class PeerList
 */
class PeerList extends Base {
    constructor (options) {
        super({ ...DEFAULT_OPTIONS, ...options });
        this.onPeerUpdate = this.onPeerUpdate.bind(this);
        this.loaded = false;
        this.peers = [];

        this.db = new Datastore({
            filename: this.opts.temporary ? tmp.tmpNameSync() : this.opts.dataPath,
            autoload: true
        });
    }

    /**
     * Loads the peer database, preloading defaults, if any.
     * @param {string[]} defaultPeerURLs
     * @returns {Promise<Peer>}
     */
    load (defaultPeerURLs) {
        return new Promise ((resolve) => {
            this.db.find({}, (err, docs) => {
                this.peers = docs.map((data) => new Peer(data, { onDataUpdate: this.onPeerUpdate }));
                this.loadDefaults(defaultPeerURLs).then(() => {
                    this.log('DB and default peers loaded');
                    this.loaded = true;
                    resolve(this.peers);
                });
            });
        });
    }

    /**
     * Adds default peers to the database/list.
     * @param {string[]} defaultPeerURLs
     * @returns {Promise<Peer>}
     */
    loadDefaults (defaultPeerURLs = []) {
        return Promise.all(defaultPeerURLs.map((uri) => {
            const tokens = uri.split('/');
            return this.add({
                hostname: tokens[0],
                port: tokens[1],
                TCPPort: tokens[2],
                UDPPort: tokens[3],
                isTrusted: true,
                weight: 1.0
            });
        }))
    }

    /**
     * Update callback when the peer's data has been changed from within the peer.
     * @param peer
     * @returns {Promise.<Peer>}
     */
    onPeerUpdate (peer) {
        const data = peer.data;
        delete data._id;
        return this.update(peer, data, false);
    }

    /**
     * Partially updates a peer with the provided data. Saves into database.
     * @param {Peer} peer
     * @param {Object} data
     * @param {boolean} refreshPeer - whether to update the peers data.
     * @returns {Promise<Peer>}
     */
    update (peer, data, refreshPeer=true) {
        const newData = { ...peer.data, ...data };
        const updater = () => new Promise((resolve) => {
            this.db.update({ _id: peer.data._id }, newData, { returnUpdatedDocs: true }, () => {
                // this.log(`updated peer ${peer.data.hostname}:${peer.data.port}`, data);
                resolve(peer);
            })
        });
        return refreshPeer ? peer.update(newData, false).then(updater) : updater();
    }

    /**
     * Returns currently loaded peers.
     * @returns {Peer[]}
     */
    all () {
        return this.peers
    }

    /**
     * Removes all peers.
     */
    clear () {
        this.log('Clearing all known peers');
        this.peers = [];
        return new Promise((resolve) => this.db.remove({}, { multi: true }, resolve));
    }

    /**
     * Gets the average age of all known peers
     * @returns {number}
     */
    getAverageAge () {
        return this.peers.map(p => getSecondsPassed(p.data.dateCreated)).reduce((s, x) => s + x, 0) / this.peers.length;
    }

    /**
     * Returns peers, whose remoteKey, hostname or IP equals the address.
     * Port is only considered if mutiPort option is true.
     * If remoteKey matches, the address is not considered.
     * @param {string} remoteKey
     * @param {string} address
     * @param {number} port
     * @returns {Promise<Peer[]|null>}
     */
    findByRemoteKeyOrAddress(remoteKey, address, port) {
        return new Promise((resolve) => {
            let byKey = [];
            if (remoteKey) {
                byKey = this.peers.filter((p) => p.data.remoteKey && p.data.remoteKey === remoteKey);
            }
            if (byKey.length) {
                resolve(byKey);
            } else {
                this.findByAddress(address, port).then(resolve);
            }
        });
    }

    /**
     * Returns peers, whose hostname or IP equals the address.
     * Port is only considered if mutiPort option is true.
     * @param {string} address
     * @param {number} port
     * @returns {Promise<Peer[]|null>}
     */
    findByAddress (address, port) {
        const addr = PeerList.cleanAddress(address);
        return new Promise((resolve) => {
            const findWithIP = (ip) => {
                const peers = this.peers.filter((p) => (
                    p.data.hostname === addr ||
                    p.data.hostname === address ||
                    ip && (p.data.hostname === ip || p.data.ip === ip)
                ));
                resolve(this.opts.multiPort
                    ? peers.filter((p) => p.data.port == port)
                    : peers
                )
            };

            if (ip.isV6Format(addr) || ip.isV4Format(addr) || this.opts.multiPort) {
                findWithIP(addr);
            } else {
                dns.resolve(addr, 'A', (error, results) => findWithIP(error || !results.length ? null : results[0]));
            }

        });
    }

    /**
     * Returns whether the provided uri is from a trusted node
     * @param {URL|string} uri
     * @returns {Promise<boolean>}
     */
    isTrusted (uri) {
        let u = null;
        try {
            u = typeof uri === 'string' ? new URL(uri) : uri;
        } catch (error) {
            return false;
        }

        return this.findByAddress(u.hostname, u.port).then((peers) => peers.filter((p) => p.isTrusted()).length > 0);
    }

    /**
     * Calculates the weight of a peer
     * @param {Peer} peer
     * @returns {number}
     */
    getPeerWeight (peer) {
        if (this.opts.isMaster) {
            const weightedAge = ((peer.data.dateLastConnected || peer.data.dateCreated) - peer.data.dateCreated) / 1000;
            return Math.max(weightedAge, 1);
        }
        const weightedAge = getSecondsPassed(peer.data.dateCreated) * peer.data.weight;
        return Math.max(weightedAge, 1);
    }

    /**
     * Get a certain amount of weighted random peers. Return peers with their respective weight ratios
     * The weight depends on relationship age (connections) and trust (weight).
     * @param {number} amount
     * @param {Peer[]} sourcePeers list of peers to use. Optional for filtering purposes.
     * @returns {Array<Peer, number>}
     */
    getWeighted (amount = 0, sourcePeers=null) {
        amount = amount || this.peers.length;
        const peers = sourcePeers || Array.from(this.peers);
        if (!peers.length) {
            return [];
        }
        const allWeights = peers.map(p => this.getPeerWeight(p));
        const weightsMax = Math.max(...allWeights);

        const choices = [];
        const getChoice = () => {
            const peer = weighted(peers, peers.map(p => this.getPeerWeight(p)));
            peers.splice(peers.indexOf(peer), 1);
            const weightsArray = allWeights.splice(peers.indexOf(peer), 1);
            choices.push([peer, weightsArray[0] / weightsMax]);
        };

        for (let x = 0; x < amount; x++) {
            getChoice();
            if (peers.length < 1) {
                break;
            }
        }
        return choices.filter(c => c && c[0]).map((c) => [c[0], c[0].isTrusted() ? 1 : c[1]]);
    }

    /**
     * Adds a new peer to the list using an URI
     * @param {object} data
     * @returns {*}
     */
    add (data) {
        const {
            hostname,
            port: rawPort,
            TCPPort: rawTCPPort,
            UDPPort: rawUDPPort,
            isTrusted,
            weight,
            remoteKey,
            name
        } = Object.assign({
            TCPPort: DEFAULT_IRI_OPTIONS.TCPPort,
            UDPPort: DEFAULT_IRI_OPTIONS.UDPPort,
            isTrusted: false,
            weight: 0,
            remoteKey: null
        }, data);
        const port = parseInt(rawPort);
        const TCPPort = parseInt(rawTCPPort || DEFAULT_IRI_OPTIONS.TCPPort);
        const UDPPort = parseInt(rawUDPPort || DEFAULT_IRI_OPTIONS.UDPPort);

        return this.findByRemoteKeyOrAddress(remoteKey, hostname, port).then((peers) => {
            const addr = PeerList.cleanAddress(hostname);
            const existing = peers.length && peers[0];

            if (existing) {
                return this.update(existing, {
                    weight: existing.data.weight < weight ? weight : existing.data.weight,
                    key: existing.data.key || createIdentifier(),
                    remoteKey: remoteKey || existing.data.remoteKey,
                    name: name || existing.data.name,
                    port, TCPPort, UDPPort
                });
            } else {
                this.log(`Adding to the list of known Nelson peers: ${hostname}:${port}`, data);
                const peerIP = ip.isV4Format(addr) || ip.isV6Format(addr) ? addr : null;
                const peer = new Peer(
                    {
                        port,
                        hostname: addr,
                        ip: peerIP,
                        TCPPort: TCPPort || DEFAULT_IRI_OPTIONS.TCPPort,
                        UDPPort: UDPPort || DEFAULT_IRI_OPTIONS.UDPPort,
                        isTrusted,
                        name,
                        weight,
                        remoteKey,
                        key: createIdentifier(),
                        dateCreated: new Date()
                    }, { onDataUpdate: this.onPeerUpdate }
                );
                this.peers.push(peer);
                return new Promise((resolve, reject) => {
                    this.db.insert(peer.data, (err, doc) => {
                        if (err) {
                            reject(err);
                        }
                        peer.update(doc);
                        resolve(peer);
                    })
                })
            }
        })
    }

    /**
     * Converts an address to a cleaner format.
     * @param {string} address
     * @returns {string}
     */
    static cleanAddress (address) {
        if (!ip.isV4Format(address) && !ip.isV6Format(address)) {
            return address;
        }
        return ip.isPrivate(address) ? 'localhost' : address.replace('::ffff:', '')
    }
}

module.exports = {
    DEFAULT_OPTIONS,
    PeerList
};
