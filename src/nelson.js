#!/usr/bin/env node
require('colors');

const ini = require('ini');
const fs = require('fs');
const { URL } = require('url');
const program = require('commander');
const { initNode } = require('./index');
const { DEFAULT_OPTIONS } = require('./node/node');
const { PROTOCOLS } = require('./node/peer');
const { DEFAULT_OPTIONS: DEFAULT_LIST_OPTIONS } = require('./node/peer-list');
const { DEFAULT_OPTIONS: DEFAULT_API_OPTIONS } = require('./api/index');
const version = require('../package.json').version;

const parseNeighbors = (val) => val.split(' ');
const parseURLs = (val) => val.split(' ').map((v) => new URL(v)).map((u) => u.href);
const parseProtocol = (val) => {
    const lower = val.toLowerCase();
    return PROTOCOLS.includes(lower) ? lower : DEFAULT_OPTIONS.IRIProtocol
};
const parseNumber = (v) => parseInt(v);
const parseAuth = (v) => {
  const tokens = v.split(':');
  if(!tokens.length === 2) {
      throw new Error('Wrong apiAuth format! Use: "username.password"');
  }
  if (!tokens[0].length) {
      throw new Error('apiAuth username not provided!');
  }
  if(!tokens[1].length) {
      throw new Error('apiAuth password not provided!');
  }
  return { username: tokens[0], password: tokens[1]}
};

program
    .version(version)
    .option('--name [value]', 'Name of your node instance', DEFAULT_OPTIONS.name)
    .option('-n, --neighbors [value]', 'Trusted neighbors', parseNeighbors, [])
    .option('--getNeighbors [url]', 'Download default set of neighbors', false)
    .option('-c, --cycleInterval [value]', 'Cycle interval in seconds', parseNumber, DEFAULT_OPTIONS.cycleInterval)
    .option('-e, --epochInterval [value]', 'Epoch interval in seconds', parseNumber, DEFAULT_OPTIONS.epochInterval)
    .option('--incomingMax [value]', 'Maximal incoming connection slots', parseNumber, DEFAULT_OPTIONS.incomingMax)
    .option('--outgoingMax [value]', 'Maximal outgoing connection slots', parseNumber, DEFAULT_OPTIONS.outgoingMax)
    .option('--lazyLimit [value]', 'Seconds after which neighbor is dropped for not having provided any new TXs', parseNumber, DEFAULT_OPTIONS.lazyLimit)
    .option('--lazyTimesLimit [value]', 'How many consecutive times a lazy neighbor can connect before getting penalized', parseNumber, DEFAULT_OPTIONS.lazyTimesLimit)
    .option('--apiAuth [value]', 'Nelson API username:password', parseAuth, null)
    .option('-a, --apiPort [value]', 'Nelson API port', parseNumber, DEFAULT_API_OPTIONS.apiPort)
    .option('-o, --apiHostname [value]', 'Nelson API hostname', DEFAULT_API_OPTIONS.apiHostname)
    .option('-w, --webhooks [value]', 'Nelson API webhook URLs', parseURLs, DEFAULT_API_OPTIONS.webhooks)
    .option('--webhookInterval [value]', 'Webhooks callback interval in seconds', parseNumber, DEFAULT_API_OPTIONS.webhookInterval)
    .option('-p, --port [value]', 'Nelson port', parseNumber, DEFAULT_OPTIONS.port)
    .option('-r, --IRIHostname [value]', 'IRI API hostname', DEFAULT_OPTIONS.IRIHostname)
    .option('-i, --IRIPort [value]', 'IRI API port', parseNumber, DEFAULT_OPTIONS.IRIPort)
    .option('-t, --TCPPort [value]', 'IRI TCP port', parseNumber, DEFAULT_OPTIONS.TCPPort)
    .option('-u, --UDPPort [value]', 'IRI UDP port', parseNumber, DEFAULT_OPTIONS.UDPPort)
    .option('--IRIProtocol [value]', 'IRI protocol to use: udp, tcp, prefertcp, preferudp or any', parseProtocol, DEFAULT_OPTIONS.IRIProtocol)
    .option('-d, --dataPath [value]', 'Peer database path', DEFAULT_LIST_OPTIONS.dataPath)
    .option('-m, --isMaster [value]', 'Is a master node', false)
    .option('-s, --silent [value]', 'Silent', false)
    .option('-g, --gui [value]', 'GUI', false)
    .option('--temporary [value]', 'Create a temporary node', false)
    .option('--config [value]', 'Config file path', null)
    .parse(process.argv);

const configPath = process.env.NELSON_CONFIG || program.config;

initNode(configPath ? ini.parse(fs.readFileSync(configPath, 'utf-8')).nelson : program);
