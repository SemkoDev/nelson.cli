require('colors');
const terminal = require('./node/tools/terminal');
const node = require('./node').node;
const api = require('./node').api;
const utils = require('./node').utils;

// Some general TODOs:
// TODO: add linting
// TODO: add editor config

module.exports = {
    initNode: (opts) => {
        const _node = new node.Node(opts);
        const terminate = () => _node.end().then(
            () => {
                process.exit(0);
            }
        );

        process.on('SIGINT', terminate);
        process.on('SIGTERM', terminate);
        terminal.init(utils.getVersion(), terminate);

        _node.start().then((n) => {
            if (n.opts && !n.opts.gui) {
                terminal.exit();
            }
            api.createAPI(n);
            terminal.ports(n.opts);
            n.log(`Nelson v.${utils.getVersion()} initialized`.green.bold);
        });
    },
    ...node
};
