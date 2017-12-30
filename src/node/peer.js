const ip = require('ip');
const dns = require('dns');
const { Base } = require('./base');
const { DEFAULT_OPTIONS: DEFAULT_IRI_OPTIONS } = require('./iri');
const { getSecondsPassed, createIdentifier } = require('./tools/utils');

const DEFAULT_OPTIONS = {
    onDataUpdate: (data) => Promise.resolve(),
    ipRefreshTimeout: 1200,
    silent: true,
    logIdent: 'PEER',
    lazyLimit: 300, // Time, after which a peer is considered lazy, if no new TXs received
    lazyTimesLimit: 3 // starts to penalize peer's quality if connected so many times without new TXs
};
const DEFAULT_PEER_DATA = {
    name: null,
    hostname: null,
    ip: null,
    port: 31337,
    TCPPort: DEFAULT_IRI_OPTIONS.TCPPort,
    UDPPort: DEFAULT_IRI_OPTIONS.UDPPort,
    seen: 1,
    connected: 0,
    tried: 0,
    weight: 1.0,
    dateTried: null,
    dateLastConnected: null,
    dateCreated: null,
    isTrusted: false,
    key: null,
    remoteKey: null,
    lastConnections: []
};

/**
 * A utility class for a peer that holds peer's data and provides a few util methods.
 *
 * @class Peer
 */
class Peer extends Base {
    constructor (data = {}, options) {
        super({ ...DEFAULT_OPTIONS, ...options, logIdent: `${data.hostname}:${data.port}`});
        this.data = null;
        this.lastConnection = null;

        this.update({ ...DEFAULT_PEER_DATA, ...data });
    }

    /**
     * Partial peer's data update
     * @param {Object} data
     * @param {boolean} doCallback - whether to call back on data changes
     * @returns {Promise<Object>} - updates data
     */
    update (data, doCallback=true) {
        // Reset last updated date if the hostname has changed
        let shouldUpdate = false;
        const hostnameChanged = this.data && (this.data.hostname !== (data && data.hostname));
        this.iplastUpdated = this.data && hostnameChanged ? null : this.iplastUpdated;
        this.data = { ...this.data, ...data };
        if (hostnameChanged && this.data.ip) {
            this.data.ip = null;
            shouldUpdate = true;
        }
        if (!this.data.ip) {
            this.data.ip = this._isHostnameIP() ? this.data.hostname : null;
            shouldUpdate = true;
        }
        return shouldUpdate && doCallback
            ? this.opts.onDataUpdate(this).then(() => this.data)
            : Promise.resolve(this.data);
    }

    /**
     * Gets the IP address of the peer. Independently if peer's address is a hostname or IP.
     * Update's the peer data to save the last known IP.
     * @returns {Promise<string>}
     */
    getIP () {
        return new Promise ((resolve) => {
            if (!this.data.ip || (!this._isHostnameIP() && this._isIPOutdated())) {
                dns.resolve(this.data.hostname, 'A', (error, results) => {
                    // if there was an error, we set the hostname as ip, even if it's not the case.
                    // It will be re-tried next refresh cycle.
                    const ip = error || !results.length ? null : results[0];
                    this.iplastUpdated = new Date();
                    if (ip && ip !== this.data.ip) {
                        this.data.ip = ip;
                        this.opts.onDataUpdate(this).then(() => resolve(ip));
                    } else {
                        resolve(ip)
                    }
                })
            }
            else {
                resolve(this.data.ip)
            }
        })
    }

    /**
     * Marks this node as connected.
     * @returns {Promise.<Peer>}
     */
    markConnected () {
        if (this.lastConnection) {
            return Promise.resolve(this);
        }
        this.lastConnection = {
            start: new Date(),
            duration: 0,
            numberOfAllTransactions: 0,
            numberOfNewTransactions: 0,
            numberOfInvalidTransactions: 0
        };

        return this.update({
            key: this.data.key || createIdentifier(),
            tried: 0,
            connected: this.data.connected + 1,
            dateLastConnected: new Date()
        }).then(() => this);
    }

    /**
     * Marks the node as disconnected. Saves connection stats in DB.
     * @returns {Promise.<Peer>}
     */
    markDisconnected () {
        if (!this.lastConnection) {
            return Promise.resolve(this);
        }

        const lastConnections = [ ...this.data.lastConnections, {
            ...this.lastConnection,
            end: new Date(),
            duration: this.getConnectionDuration()
        }].slice(-10);

        this.lastConnection = null;
        return this.update({ lastConnections }).then(() => this);
    }

    /**
     * Returns time in seconds that passed since the node has been connected
     * @returns {number}
     */
    getConnectionDuration () {
        if (!this.lastConnection) {
            return 0;
        }
        return getSecondsPassed(this.lastConnection.start)
    }

    /**
     * Updates the stats of the currently connected peer
     * @param data
     */
    updateConnection (data) {
        if (!this.lastConnection) {
            return;
        }

        const {
            numberOfAllTransactions,
            numberOfRandomTransactionRequests,
            numberOfNewTransactions,
            numberOfInvalidTransactions
        } = data;
        this.lastConnection = {
            ...this.lastConnection,
            numberOfAllTransactions,
            numberOfRandomTransactionRequests,
            numberOfNewTransactions,
            numberOfInvalidTransactions
        }
    }

    /**
     * Returns peer's quality based on last connection stats.
     * @returns {number}
     */
    getPeerQuality () {
        const history = [ ...this.data.lastConnections, this.lastConnection].filter(h => h);
        const newTrans = history.reduce((s, h) => s + h.numberOfNewTransactions, 0);
        const badTrans = history.reduce((s, h) => s + h.numberOfInvalidTransactions, 0);
        const rndTrans = history.reduce((s, h) => s + (h.numberOfRandomTransactionRequests || 0), 0);
        const badRatio = parseFloat(badTrans * 3 + rndTrans) / (newTrans || 1);
        const serialPenalization = !this.isTrusted() && !newTrans && history.length >= this.opts.lazyTimesLimit
            ? 1.0 / history.length
            : 1.0;
        const score = Math.max(0.0, 1.0 / (badRatio || 1)) * serialPenalization;
        return Math.max(0.01, score);
    }

    /**
     * Returns whether a connected peer has not sent any new transactions for a prolonged period of time.
     * @returns {boolean}
     */
    isLazy () {
        return this.lastConnection &&
            getSecondsPassed(this.lastConnection.start) > this.opts.lazyLimit &&
            (
                this.lastConnection.numberOfNewTransactions === 0 ||
                this.lastConnection.numberOfNewTransactions < this.lastConnection.numberOfRandomTransactionRequests
            )
    }

    getTCPURI () {
        return `tcp://${this.data.hostname}:${this.data.TCPPort}`
    }

    getUDPURI () {
        return `udp://${this.data.hostname}:${this.data.UDPPort}`
    }

    getNelsonURI () {
        return `http://${this.data.hostname}:${this.data.port}`
    }

    getHostname () {
        return `${this.data.hostname}/${this.data.port}/${this.data.TCPPort}/${this.data.UDPPort}`
    }

    isTrusted () {
        return this.data && this.data.isTrusted
    }

    isSameIP (ip) {
        return this.getIP().then((myIP) => myIP && myIP === ip);
    }

    _isHostnameIP () {
        return ip.isV4Format(this.data.hostname) || ip.isV6Format(this.data.hostname)
    }

    _isIPOutdated () {
        return !this.iplastUpdated || getSecondsPassed(this.iplastUpdated) > this.opts.ipRefreshTimeout
    }
}

module.exports = {
    DEFAULT_OPTIONS,
    DEFAULT_PEER_DATA,
    Peer
};
