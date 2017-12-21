const { Base } = require('./base');
const { getSecondsPassed } = require('./tools/utils');

const DEFAULT_OPTIONS = {
    beatInterval: 1,
    localNodes: false,
    logIdent: 'GUARD',
};

/**
 * Simple throttling system for incoming connections.
 * @class Heart
 */
class Guard extends Base {
    constructor (options) {
        super({ ...DEFAULT_OPTIONS, ...options });
        this.requests = {};
    }

    isAllowed (address, port) {
        const target = `${this.opts.localNodes ? port : address}`;
        if (!this.requests[target]) {
            this.requests[target] = new Date();
            return true;
        }
        else {
            const allowed = getSecondsPassed(this.requests[target]) >= this.opts.beatInterval * 2;
            this.requests[target] = new Date();
            return allowed;
        }
    }
}

module.exports = {
    DEFAULT_OPTIONS,
    Guard
};
