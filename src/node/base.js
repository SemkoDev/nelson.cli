require('colors');
const terminal = require('./tools/terminal');

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
            const timeString = `${date.toLocaleTimeString()}.${this.formatMilliseconds(date.getMilliseconds())}`.dim;
            const space = this.opts.logIdent.length > this.opts.logIdentWidth
                ? `\n${' '.repeat(this.opts.logIdentWidth)}`
                : ' '.repeat(this.opts.logIdentWidth - this.opts.logIdent.length);
            const logIdent = `${this.opts.logIdent}${space}`.dim.bold;

            terminal.log(`${timeString}\t${logIdent}`, ...arguments);
        }
    }

    formatNode (hostname, port) {
        return `${hostname}:${port}`.cyan
    }

    formatMilliseconds(milliseconds){
      var formatted = milliseconds / 1000;
      formatted = formatted.toFixed(3);
      formatted = formatted.toString();
      return formatted.slice(2);
    }

    start () {}

    end () {}
}

module.exports = {
    DEFAULT_OPTIONS,
    Base
};
