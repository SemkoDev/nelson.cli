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
            const space = this.opts.logIdent.length > this.opts.logIdentWidth
                ? `\n${' '.repeat(this.opts.logIdentWidth)}`
                : ' '.repeat(this.opts.logIdentWidth - this.opts.logIdent.length);

            console.log(`${(new Date()).getTime()} ${this.opts.logIdent}${space}`, ...arguments);
        }
    }

    start () {}

    end () {}
}

module.exports = {
    DEFAULT_OPTIONS,
    Base
};