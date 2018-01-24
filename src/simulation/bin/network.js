#!/usr/bin/env node
const program = require('commander');
const { spawnMockedNetwork, DEFAULT_OPTS } = require('../network');
const version = require('../../../package.json').version;

const parseNumber = (v) => parseInt(v);

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

program
    .version(version)
    .option('-c, --cycleInterval [value]', 'Cycle interval in seconds', parseNumber, DEFAULT_OPTS.cycleInterval)
    .option('-e, --epochInterval [value]', 'Epoch interval in seconds', parseNumber, DEFAULT_OPTS.epochInterval)
    .option('-p, --startingPort [value]', 'Starting port', parseNumber, DEFAULT_OPTS.startingPort)
    .option('-n, --nodesCount [value]', 'Normal nodes amount', parseNumber, DEFAULT_OPTS.nodesCount)
    .option('-m, --masterNodesCount [value]', 'Master nodes amount', parseNumber, DEFAULT_OPTS.masterNodesCount)
    .option('-s, --silent', 'Silent', DEFAULT_OPTS.silent)
    .parse(process.argv);

const proc = spawnMockedNetwork({
    ...program,
    callback: stats.onCallback
});

process.on('SIGINT', proc.end);
process.on('SIGTERM', proc.end);
