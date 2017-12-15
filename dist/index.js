'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

require('colors');
var terminal = require('./node/tools/terminal');
var node = require('./node').node;
var api = require('./node').api;
var utils = require('./node').utils;

// Some general TODOs:
// TODO: add linting
// TODO: add editor config

module.exports = _extends({
    initNode: function initNode(opts) {
        var _node = new node.Node(opts);
        var terminate = function terminate() {
            return _node.end().then(function () {
                process.exit(0);
            });
        };

        process.on('SIGINT', terminate);
        process.on('SIGTERM', terminate);
        opts.gui && terminal.init(utils.getVersion(), terminate);

        _node.start().then(function (n) {
            api.createAPI(n);
            terminal.ports(n.opts);
            n.log(('Nelson v.' + utils.getVersion() + ' initialized').green.bold);
        });
    }
}, node);