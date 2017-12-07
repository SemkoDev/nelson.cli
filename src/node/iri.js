const IOTA = require('iota.lib.js');
const tmp = require('tmp');
const { Base } = require('./base');

tmp.setGracefulCleanup();

const DEFAULT_OPTIONS = {
    port: 14600,
    logIdent: 'IRI'
};

/**
 * Class responsible to RUN and communicate with local IRI instance
 * @class
 */
class IRI extends Base {
    constructor (options) {
        super({ ...DEFAULT_OPTIONS, ...options });
        this.api = (new IOTA({ host: 'http://localhost', port: this.opts.port })).api;
        this.removeNeighbors = this.removeNeighbors.bind(this);
        this.addNeighbors = this.addNeighbors.bind(this);
        this.updateNeighbors = this.updateNeighbors.bind(this);
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
                    resolve(this);
                } else {
                    reject(error);
                }
            });
        })
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
        return new Promise ((resolve, reject) => {
            this.api.removeNeighbors(peers.map((p) => p.getTCPURI()), (err) => {
                if (err) {
                    reject(err);
                }
                this.log('Neighbors removed', peers.map(p => p.getNelsonURI()));
                resolve(peers)
            });
        })
    }

    /**
     * Adds a list of peers to IRI.
     * @param {Peer[]} peers
     * @returns {Promise<Peer[]>}
     */
    addNeighbors (peers) {
        const uris = peers.map((p) => p.getTCPURI());
        return new Promise((resolve, reject) => {
            this.api.addNeighbors(uris, (error, data) => {
                if(error) {
                    reject(error);
                    return;
                }
                resolve(peers);
                this.log('Neighbors added:', data, uris.join(', '));
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

}

module.exports = {
    DEFAULT_OPTIONS,
    IRI
};
