require('colors')

const DEFAULT_OPTIONS = {
    silent: false,
    logIdent: 'BASE',
    logIdentWidth: 12,
};

/**
 * Base class with generic functionality.
 * @class Base
 */
class Base {
    constructor (options) {
        this.opts = { ...DEFAULT_OPTIONS, ...options };
    }

    log () {
        if (!this.opts || !this.opts.silent || arguments[0] === '!!') {
            const date = new Date();
            const timeString = `${date.toLocaleTimeString()}.${date.getMilliseconds()}`.dim;
            const space = this.opts.logIdent.length > this.opts.logIdentWidth
                ? `\n${' '.repeat(this.opts.logIdentWidth)}`
                : ' '.repeat(this.opts.logIdentWidth - this.opts.logIdent.length);
            const logIdent = `${this.opts.logIdent}${space}`.dim.bold;

            console.log(`${timeString} ${logIdent}`, ...arguments);
        }
    }

    start () {}

    end () {}
}

module.exports = {
    DEFAULT_OPTIONS,
    Base
};
