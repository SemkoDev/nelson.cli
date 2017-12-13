'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('./base'),
    Base = _require.Base;

var _require2 = require('./tools/utils'),
    getSecondsPassed = _require2.getSecondsPassed,
    getRandomInt = _require2.getRandomInt,
    createIdentifier = _require2.createIdentifier;

var terminal = require('./tools/terminal');

var DEFAULT_OPTIONS = {
    cycleInterval: 300,
    epochInterval: 900,
    beatInterval: 1,
    autoStart: false,
    logIdent: 'HEART',
    onEpoch: function onEpoch(currentEpoch) {
        return Promise.resolve(false);
    },
    onCycle: function onCycle(currentCycle) {
        return Promise.resolve(false);
    },
    onTick: function onTick(currentCycle) {
        return Promise.resolve(0);
    }
};

/**
 * Manages epoch and cycle updates
 * @class Heart
 */

var Heart = function (_Base) {
    _inherits(Heart, _Base);

    function Heart(options) {
        _classCallCheck(this, Heart);

        var _this = _possibleConstructorReturn(this, (Heart.__proto__ || Object.getPrototypeOf(Heart)).call(this, _extends({}, DEFAULT_OPTIONS, options)));

        _this.id = null;
        _this.ticker = null;
        _this.lastCycle = null;
        _this.lastEpoch = null;
        _this.personality = {};
        _this.currentCycle = 0;
        _this.currentEpoch = 0;
        _this.startDate = null;
        _this._tick = _this._tick.bind(_this);
        _this.opts.autoStart && _this.start();
        return _this;
    }

    _createClass(Heart, [{
        key: 'start',
        value: function start() {
            this.startDate = new Date();
            this.startNewEpoch();
            this.lastCycle = new Date();
            this.log('Cycle/epoch intervals:', this.opts.cycleInterval, this.opts.epochInterval);
            terminal.settings({
                epochInterval: this.opts.epochInterval,
                cycleInterval: this.opts.cycleInterval,
                startDate: this.startDate
            });
            this._tick();
        }
    }, {
        key: 'end',
        value: function end() {
            this.ticker && clearTimeout(this.ticker);
        }

        /**
         * Starts new epoch, resetting node identifiers and memorizing last epoch switch datetime.
         */

    }, {
        key: 'startNewEpoch',
        value: function startNewEpoch() {
            this.setNewPersonality();
            this.lastEpoch = new Date();
            this.currentEpoch += 1;
        }

        /**
         * Sets this heart's personality: ID, feature, etc.
         */

    }, {
        key: 'setNewPersonality',
        value: function setNewPersonality() {
            var id = createIdentifier();
            this.personality = {
                id: id,
                publicId: id.slice(0, 8),
                feature: id[getRandomInt(0, id.length)]
            };
            this.log('new personality', this.personality.feature, this.personality.id);
        }

        /**
         * Ticker that handles cycle and epoch changes.
         * @private
         */

    }, {
        key: '_tick',
        value: function _tick() {
            var _this2 = this;

            this.opts.onTick(this.currentCycle).then(function () {
                terminal.beat(_this2.currentEpoch, _this2.currentCycle, _this2.startDate);
                if (getSecondsPassed(_this2.lastCycle) > _this2.opts.cycleInterval) {
                    _this2.opts.onCycle(_this2.currentCycle).then(function (skipABeat) {
                        if (!skipABeat) {
                            _this2.lastCycle = new Date();
                            _this2.currentCycle += 1;
                            if (getSecondsPassed(_this2.lastEpoch) > _this2.opts.epochInterval) {
                                _this2.opts.onEpoch(_this2.currentEpoch).then(function (skipAge) {
                                    !skipAge && _this2.startNewEpoch();
                                    _this2._setTicker();
                                });
                                return;
                            }
                        }
                        _this2._setTicker();
                    });
                    return;
                }
                _this2._setTicker();
            });
        }

        /**
         * Sets the ticker for the next beat
         * @private
         */

    }, {
        key: '_setTicker',
        value: function _setTicker() {
            this.ticker && clearTimeout(this.ticker);
            this.ticker = setTimeout(this._tick, this.opts.beatInterval * 1000);
        }
    }]);

    return Heart;
}(Base);

module.exports = {
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    Heart: Heart
};