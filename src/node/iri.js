const IOTA = require('iota.lib.js');
const { URL } = require('url');
const tmp = require('tmp');
const { Base } = require('./base');
const { getIP } = require('./tools/utils');

tmp.setGracefulCleanup();

const DEFAULT_OPTIONS = {
    hostname: 'localhost',
    port: 14265,
    TCPPort: 15600,
    UDPPort: 14600,
    logIdent: 'IRI',
    onHealthCheck: (isHealthy, neighbors) => {}
};

/**
 * Class responsible to RUN and communicate with local IRI instance
 * @class
 */
class IRI extends Base {
    constructor (options) {
        super({ ...DEFAULT_OPTIONS, ...options });
        this.api = (new IOTA({ host: `http://${this.opts.hostname}`, port: this.opts.port })).api;
        this.removeNeighbors = this.removeNeighbors.bind(this);
        this.addNeighbors = this.addNeighbors.bind(this);
        this.updateNeighbors = this.updateNeighbors.bind(this);
        this._tick = this._tick.bind(this);
        this._getIRIPeerURI = this._getIRIPeerURI.bind(this);
        this.ticker = null;
        this.isHealthy = false;
        this.iriStats = {};
        this.staticNeighbors = [];
    }

    /**
     * Starts the IRI process, returning self on success.
     * @returns {Promise<IRI>}
     */
    start () {
        return new Promise((resolve) => {
            const getNodeInfo = () => this.api.getNeighbors((error, neighbors) => {
                if (!error) {
                    const addresses = neighbors.map((n) => (new URL(`${n.connectionType}://${n.address}`)).hostname);
                    Promise.all(addresses.map(getIP)).then((ips) => {
                        this._isStarted = true;
                        this.isHealthy = true;
                        this.staticNeighbors = ips.concat(addresses);
                        this.log(`Static neighbors: ${addresses}`);
                        // TODO: make ticker wait for result, like in the heart.
                        this.ticker = setInterval(this._tick, 15000);
                        this.getStats().then(() => resolve(this));
                    });
                } else {
                    this.log(`IRI not ready on ${this.opts.hostname}:${this.opts.port}, retrying...`.yellow);
                    setTimeout(getNodeInfo, 5000);
                }
            });
            getNodeInfo();
        })
    }

    end () {
        this.isHealthy = false;
        this._isStarted = false;
        this.staticNeighbors = [];
        this.ticker && clearTimeout(this.ticker);
        this.ticker = null;
    }

    /**
     * Returns whether the process has been started.
     * @returns {boolean}
     */
    isStarted () {
        return this._isStarted
    }

    /**
     * Returns whether the IRI process is running and can be communicated with.
     * @returns {boolean}
     */
    isAvailable () {
        return this.isStarted() && this.isHealthy
    }

    /**
     * Returns whether a peer's IP or hostname is added as static neighbor in IRI.
     * @param {Peer} peer
     * @returns {boolean}
     */
    isStaticNeighbor (peer) {
        return !!this.staticNeighbors.filter((n) => n === peer.data.ip || n === peer.data.hostname).length;
    }

    /**
     * Removes a list of neighbors from IRI, except static neighbors. Returns list of removed peers.
     * @param {Peer[]} peers
     * @returns {Promise<Peer[]>}
     */
    removeNeighbors (peers) {
        if (!this.isAvailable()) {
            return Promise.reject();
        }

        const myPeers = peers.filter((peer) => {
            if (this.isStaticNeighbor(peer)) {
                this.log(`WARNING: trying to remove a static neighbor. Skipping: ${peer.data.hostname}`.yellow);
                return false;
            }
            return true;
        });

        if (!peers.length) {
            return Promise.resolve([]);
        }

        const uris = myPeers.map(this._getIRIPeerURI);
        return new Promise ((resolve, reject) => {
            this.api.removeNeighbors(uris, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.log('Neighbors removed (if there were any):'.red, uris.join(', '));
                resolve(peers)
            });
        });
    }

    /**
     * Adds a list of peers to IRI.
     * @param {Peer[]} peers
     * @returns {Promise<Peer[]>}
     */
    addNeighbors (peers) {
        if (!this.isAvailable()) {
            return Promise.reject();
        }

        const uris = peers.map(this._getIRIPeerURI);

        return new Promise((resolve, reject) => {
            this.api.addNeighbors(uris, (error) => {
                if(error) {
                    reject(error);
                    return;
                }
                this.log('Neighbors added:'.green, uris.join(', '));
                resolve(peers);
            });
        });
    }

    /**
     * Cleans up any orphans from the IRI
     * @param {Peer[]} peers
     * @returns {Promise<URL[]>}
     */
    cleanupNeighbors (peers) {
        if (!this.isAvailable()) {
            return Promise.reject();
        }
        return new Promise((resolve) => {
            this.api.getNeighbors((error, neighbors) => {
                if(error) {
                    return resolve();
                }
                Promise.all(neighbors.map((n) => {
                    const url = new URL(`${n.connectionType}://${n.address}`);
                    return getIP(url.hostname).then((ip) => {
                        url.ip = ip;
                        return url;
                    })
                })).then((urls) => {
                    const toRemove = urls.filter((url) =>
                        !this.staticNeighbors.includes(url.hostname) &&
                        !this.staticNeighbors.includes(url.ip) &&
                        peers.filter((p) => (p.data.hostname !== url.hostname && p.data.ip !==url.ip)).length === 0
                    );
                    if (!toRemove.length) {
                        return resolve(toRemove);
                    }
                    this.api.removeNeighbors(toRemove, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        this.log('Removed orphans:'.red, toRemove.map((url) => url.hostname));
                        resolve(toRemove)
                    });
                });
            });
        });
    }

    /**
     * Updates the list of neighbors at the IRI backend. Removes all neighbors, replacing them with
     * the newly provided neighbors.
     * @param {Peer[]} peers
     * @returns {Promise<Peer[]>}
     */
    updateNeighbors (peers) {
        if (!this.isAvailable()) {
            return Promise.reject();
        }

        if (!peers || !peers.length) {
            return Promise.resolve([]);
        }

        return new Promise((resolve, reject) => {
            const addNeighbors = () => {
                this.addNeighbors(peers).then(resolve).catch(reject);
            };

            this.api.getNeighbors((error, neighbors) => {
                if(error) {
                    reject(error);
                    return;
                }
                Array.isArray(neighbors) && neighbors.length
                    ? this.api.removeNeighbors(neighbors.map((n) => `${n.connectionType}://${n.address}`), addNeighbors)
                    : addNeighbors();
            });
        });
    }

    /**
     * Removes all IRI neighbors, except static neighbors.
     * @returns {Promise}
     */
    removeAllNeighbors () {
        if (!this.isAvailable()) {
            return Promise.reject();
        }

        return new Promise((resolve) => {
            this.api.getNeighbors((error, neighbors) => {
                if(error) {
                    return resolve();
                }
                if (Array.isArray(neighbors) && neighbors.length) {
                    // FIXME: This is broken. staticNeighbors is just a resolved IP. n.address includes port and can be a hostname.
                    // Hence, the filter will always be true.
                    const toRemove = neighbors.filter((n) => !this.staticNeighbors.includes(n.address));
                    return this.api.removeNeighbors(toRemove.map((n) => `${n.connectionType}://${n.address}`), resolve);
                }
                resolve();
            });
        });
    }

    /**
     * Returns IRI node info
     * @returns {Promise<object>}
     */
    getStats () {
        return new Promise((resolve, reject) => {
            this.api.getNodeInfo((error, data) => {
                if(error) {
                    return reject();
                }
                this.iriStats = data;
                resolve(data);
            });
        });
    }

    /**
     * Checks if the IRI instance is healthy, and its list of neighbors. Calls back the result to onHealthCheck.
     * @private
     */
    _tick () {
        const { onHealthCheck } = this.opts;
        const onError = () => {
            this.isHealthy = false;
            onHealthCheck(false);
        };
        this.getStats().then(() => {
            this.api.getNeighbors((error, neighbors) => {
                if(error) {
                    this.isHealthy = false;
                    onHealthCheck(false);
                    return;
                }
                this.isHealthy = true;
                // TODO: if the address is IPV6, could that pose a problem?
                onHealthCheck(true, neighbors.map((n) => ({
                    address: (new URL(`${n.connectionType}://${n.address}`)).hostname,
                    numberOfRandomTransactionRequests: n.numberOfRandomTransactionRequests,
                    numberOfAllTransactions: n.numberOfAllTransactions,
                    numberOfNewTransactions: n.numberOfNewTransactions,
                    numberOfInvalidTransactions: n.numberOfInvalidTransactions
                })));
            });
        }).catch(onError);
    }

    /**
     * Returns URI for IRI depending on the protocol.
     * @param {Peer} peer
     * @returns {string}
     * @private
     */
    _getIRIPeerURI (peer) {
        return peer.data.IRIProtocol === 'tcp' ? peer.getTCPURI() : peer.getUDPURI();
    }

}

module.exports = {
    DEFAULT_OPTIONS,
    IRI
};
