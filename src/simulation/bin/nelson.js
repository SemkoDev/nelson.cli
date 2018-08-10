#!/usr/bin/env node
const program = require('commander');
const { initMockedNode } = require('../index');
const version = require('../../../package.json').version;

const parseNeighbors = (val) => val.split(' ');
const parseProtocol = (val) => val.toLowerCase();
const parseNumber = (v) => parseInt(v);

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

program
    .version(version)
    .option('-n, --neighbors [value]', 'Trusted neighbors', parseNeighbors, [])
    .option('-c, --cycle [value]', 'Cycle interval in seconds', parseNumber, 10)
    .option('-e, --epoch [value]', 'Epoch interval in seconds', parseNumber, 60)
    .option('-p, --port [value]', 'Nelson port', parseNumber, 14265)
    .option('--IRIProtocol [value]', 'IRI protocol to use: udp or tcp, prefertcp, preferudp or any', parseProtocol ,'any')
    .option('--master [value]', 'Is master node', false)
    .option('-s, --silent [value]', 'Silent', false)
    .parse(process.argv);

initMockedNode({
    port: program.port,
    dataPort: program.dataPort,
    silent: program.silent,
    cycleInterval: program.cycle,
    epochInterval: program.epoch,
    neighbors: program.neighbors,
    isMaster: program.master,
    IRIProtocol: program.IRIProtocol
});
