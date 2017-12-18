'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

require('colors');
var request = require('request');
var terminal = require('./node/tools/terminal');
var node = require('./node').node;
var api = require('./node').api;
var utils = require('./node').utils;

// Some general TODOs:
// TODO: add linting
// TODO: add editor config

module.exports = _extends({
    initNode: function initNode(opts) {
        var init = function init(options) {
            var _node = new node.Node(options);
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
        };

        if (opts.getNeighbors) {
            if (typeof opts.getNeighbors === 'boolean') {
                opts.getNeighbors = 'https://raw.githubusercontent.com/SemkoDev/nelson.cli/master/ENTRYNODES';
            }
            var neighbors = [];
            request(opts.getNeighbors, function (err, resp, body) {
                if (err) {
                    throw err;
                }
                neighbors = body.split('\n').map(function (str) {
                    if (!str || !str.length) {
                        return null;
                    }
                    if (utils.validNeighbor(str)) {
                        console.log('Downloaded entry neighbor:', str);
                        return str;
                    } else {
                        console.log('Wrong entry neighbor format:', str);
                        return null;
                    }
                }).filter(function (n) {
                    return n;
                });
                opts.neighbors = [].concat(_toConsumableArray(opts.neighbors ? opts.neighbors : []), _toConsumableArray(neighbors));
                init(opts);
            });
        } else {
            init(opts);
        }
    }
}, node);