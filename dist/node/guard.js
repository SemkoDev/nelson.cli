'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('./base'),
    Base = _require.Base;

var _require2 = require('./tools/utils'),
    getSecondsPassed = _require2.getSecondsPassed;

var DEFAULT_OPTIONS = {
    beatInterval: 1,
    localNodes: false,
    logIdent: 'GUARD'
};

/**
 * Simple throttling system for incoming connections.
 * @class Heart
 */

var Guard = function (_Base) {
    _inherits(Guard, _Base);

    function Guard(options) {
        _classCallCheck(this, Guard);

        var _this = _possibleConstructorReturn(this, (Guard.__proto__ || Object.getPrototypeOf(Guard)).call(this, _extends({}, DEFAULT_OPTIONS, options)));

        _this.requests = {};
        return _this;
    }

    _createClass(Guard, [{
        key: 'isAllowed',
        value: function isAllowed(address, port) {
            var target = '' + (this.opts.localNodes ? port : address);
            if (!this.requests[target]) {
                this.requests[target] = new Date();
                return true;
            } else {
                var allowed = getSecondsPassed(this.requests[target]) >= this.opts.beatInterval * 2;
                this.requests[target] = new Date();
                return allowed;
            }
        }
    }]);

    return Guard;
}(Base);

module.exports = {
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    Guard: Guard
};