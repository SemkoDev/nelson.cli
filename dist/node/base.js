'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

require('colors');
var terminal = require('./tools/terminal');

var DEFAULT_OPTIONS = {
    silent: false,
    logIdent: 'BASE',
    logIdentWidth: 12
};

/**
 * Base class with generic functionality.
 * @class Base
 */

var Base = function () {
    function Base(options) {
        _classCallCheck(this, Base);

        this.opts = _extends({}, DEFAULT_OPTIONS, options);
    }

    _createClass(Base, [{
        key: 'log',
        value: function log() {
            if (!this.opts || !this.opts.silent || arguments[0] === '!!') {
                var date = new Date();
                var timeString = (date.toLocaleTimeString() + '.' + date.getMilliseconds()).dim;
                var space = this.opts.logIdent.length > this.opts.logIdentWidth ? '\n' + ' '.repeat(this.opts.logIdentWidth) : ' '.repeat(this.opts.logIdentWidth - this.opts.logIdent.length);
                var logIdent = ('' + this.opts.logIdent + space).dim.bold;

                terminal.log.apply(terminal, [timeString + ' ' + logIdent].concat(Array.prototype.slice.call(arguments)));
            }
        }
    }, {
        key: 'formatNode',
        value: function formatNode(hostname, port) {
            return (hostname + ':' + port).cyan;
        }
    }, {
        key: 'start',
        value: function start() {}
    }, {
        key: 'end',
        value: function end() {}
    }]);

    return Base;
}();

module.exports = {
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    Base: Base
};