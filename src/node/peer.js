const ip = require('ip');
const dns = require('dns');
const { Base } = require('./base');
const { DEFAULT_OPTIONS: DEFAULT_IRI_OPTIONS } = require('./iri');
const { getSecondsPassed, createIdentifier } = require('./tools/utils');

const DEFAULT_OPTIONS = {
    onDataUpdate: (data) => Promise.resolve(),
    ipRefreshTimeout: 1200,
    silent: true,
    logIdent: 'PEER'
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
};

/**
 * A utility class for a peer that holds peer's data and provides a few util methods.
 *
 * @class Peer
 */
class Peer extends Base {
    constructor (data = {}, options) {
        super({ ...DEFAULT_OPTIONS, ...options });
        this.data = null;

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
        return this.update({
            key: this.data.key || createIdentifier(),
            tried: 0,
            connected: this.data.connected + 1,
            dateLastConnected: new Date()
        }).then(() => this);
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
