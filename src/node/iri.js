const IOTA = require('iota.lib.js');
const tmp = require('tmp');
const { Base } = require('./base');

tmp.setGracefulCleanup();

const DEFAULT_OPTIONS = {
    hostname: 'localhost',
    port: 14265,
    TCPPort: 15600,
    UDPPort: 14600,
    logIdent: 'IRI',
    onHealthCheck: (isHealthy, neighbors) => {}
};

// TODO: Regular IRI health-checks needed. Prevent Nelson from connecting if IRI is down.
// TODO: regular neighbors check. If IRI removed some, disconnect the related nelson nodes.

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
        this.ticker = null;
        this.isHealthy = false;
    }

    /**
     * Starts the IRI process, returning self on success.
     * @returns {Promise<IRI>}
     */
    start () {
        return new Promise((resolve, reject) => {
            this.api.getNodeInfo((error) => {
                if (!error) {
                    this._isStarted = true;
                    this.isHealthy = true;
                    // TODO: make ticker wait for result, like in the heart.
                    this.ticker = setInterval(this._tick, 15000);
                    resolve(this);
                } else {
                    reject(error);
                }
            });
        })
    }

    end () {
        this.ticker && clearTimeout(this.ticker)
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
        return this.isStarted() && !this._isFinished
    }

    /**
     * Removes a list of neighbors from IRI
     * @param {Peer[]} peers
     * @returns {Promise<Peer[]>}
     */
    removeNeighbors (peers) {
        const uris = peers.map((p) => p.getTCPURI());
        uris.concat(peers.map((p) => p.getUDPURI()));
        return new Promise ((resolve, reject) => {
            setTimeout(() => {
                this.api.getNeighbors((error, neighbors) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    const toRemove = neighbors
                        .map((n) => `${n.connectionType}://${n.address}`)
                        .filter((n) => uris.includes(n));
                    if (toRemove.length) {
                        this.api.removeNeighbors(toRemove, (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            this.log('Neighbors removed:'.red, peers.map(p => p.getNelsonURI()));
                            resolve(peers)
                        });
                    }
                    else {
                        resolve(peers);
                    }
                });
            }, 2000)
        })
    }

    /**
     * Adds a list of peers to IRI.
     * @param {Peer[]} peers
     * @returns {Promise<Peer[]>}
     */
    addNeighbors (peers) {
        const uris = peers.map((p) => p.getUDPURI());
        return new Promise((resolve, reject) => {
            this.api.addNeighbors(uris, (error, data) => {
                if(error) {
                    reject(error);
                    return;
                }
                this.log('Neighbors added:'.green, data, uris.join(', '));
                resolve(peers);
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
     * Removes all IRI neighbors.
     * @returns {Promise}
     */
    removeAllNeighbors () {
        return new Promise((resolve) => {
            this.api.getNeighbors((error, neighbors) => {
                if(error) {
                    return resolve();
                }
                if (Array.isArray(neighbors) && neighbors.length) {
                    return this.api.removeNeighbors(neighbors.map((n) => `${n.connectionType}://${n.address}`), resolve);
                }
                resolve();
            });
        });
    }

    /**
     * Checks if the IRI instance is healthy, and its list of neighbors. Calls back the result to onHealthCheck.
     * @private
     */
    _tick () {
        const { onHealthCheck } = this.opts;
        this.api.getNeighbors((error, neighbors) => {
            if(error) {
                this.isHealthy = false;
                onHealthCheck(false);
                return;
            }
            this.isHealthy = true;
            // TODO: if the address is IPV6, could that pose a problem?
            onHealthCheck(true, neighbors.map((n) => n.address.split(':')[0]));
        });
    }

}

module.exports = {
    DEFAULT_OPTIONS,
    IRI
};
