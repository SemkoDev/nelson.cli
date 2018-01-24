#!/usr/bin/env node
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var program = require('commander');

var _require = require('../network'),
    spawnMockedNetwork = _require.spawnMockedNetwork,
    DEFAULT_OPTS = _require.DEFAULT_OPTS;

var version = require('../../../package.json').version;

var parseNumber = function parseNumber(v) {
    return parseInt(v);
};

process.on('unhandledRejection', function (reason, p) {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

program.version(version).option('-c, --cycleInterval [value]', 'Cycle interval in seconds', parseNumber, DEFAULT_OPTS.cycleInterval).option('-e, --epochInterval [value]', 'Epoch interval in seconds', parseNumber, DEFAULT_OPTS.epochInterval).option('-p, --startingPort [value]', 'Starting port', parseNumber, DEFAULT_OPTS.startingPort).option('-n, --nodesCount [value]', 'Normal nodes amount', parseNumber, DEFAULT_OPTS.nodesCount).option('-m, --masterNodesCount [value]', 'Master nodes amount', parseNumber, DEFAULT_OPTS.masterNodesCount).option('-s, --silent', 'Silent', DEFAULT_OPTS.silent).parse(process.argv);

var proc = spawnMockedNetwork(_extends({}, program, {
    callback: stats.onCallback
}));

process.on('SIGINT', proc.end);
process.on('SIGTERM', proc.end);