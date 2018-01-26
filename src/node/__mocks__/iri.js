const req = require.requireActual ? require.requireActual : require;
const { IRI: BaseIRI, DEFAULT_OPTIONS } = req('../iri');

/**
 * Class responsible to RUN and communicate with local IRI instance
 * @class
 */
class IRI extends BaseIRI {

    /**
     * Starts the IRI process, returning self on success.
     * @returns {Promise<IRI>}
     */
    start () {
        return new Promise((resolve) => {
            this._isStarted = true;
            this.isHealthy = true;
            this.ticker = setInterval(this._tick, 15000);
            this.getStats().then(() => resolve(this));
        })
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

        return new Promise ((resolve) => {
            resolve(peers)
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

        return new Promise((resolve) => {
            resolve(peers);
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
            resolve([]);
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

            addNeighbors();
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
            resolve();
        });
    }

    /**
     * Returns IRI node info
     * @returns {Promise<object>}
     */
    getStats () {
        return new Promise((resolve) => {
            this.iriStats = { mock: true };
            resolve(this.iriStats);
        });
    }

    _tick () {
        const { onHealthCheck } = this.opts;
        this.getStats().then(() => {
            onHealthCheck(true, []);
        });
    }

}

IRI.isMocked = true;

module.exports = {
    IRI,
    DEFAULT_OPTIONS
};
