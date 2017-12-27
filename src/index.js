require('colors');
const request = require('request');
const terminal = require('./node/tools/terminal');
const node = require('./node').node;
const api = require('./node').api;
const utils = require('./node').utils;

// Some general TODOs:
// TODO: add linting
// TODO: add editor config

module.exports = {
    initNode: (opts) => {
        const init = (options) => {
            const _node = new node.Node(options);
            const terminate = () => _node.end().then(
                () => {
                    process.exit(0);
                }
            );

            process.on('SIGINT', terminate);
            process.on('SIGTERM', terminate);
            opts.gui && terminal.init(utils.getVersion(), terminate);

            _node.start().then((n) => {
                api.createAPI(n, opts.webhooks, opts.webhookInterval);
                terminal.ports(n.opts);
                n.log(`Nelson v.${utils.getVersion()} initialized`.green.bold);
            });
        };

        if (opts.getNeighbors) {
            if (typeof opts.getNeighbors === 'boolean') {
                opts.getNeighbors = 'https://raw.githubusercontent.com/SemkoDev/nelson.cli/master/ENTRYNODES'
            }
            let neighbors = [];
            request(opts.getNeighbors, (err, resp, body) => {
                if (err) {
                    throw err
                }
                neighbors = body.split('\n').map((str) => {
                    if (!str || !str.length) {
                        return null;
                    }
                    if (utils.validNeighbor(str)) {
                        console.log('Downloaded entry neighbor:', str);
                        return str;
                    }
                    else {
                        console.log('Wrong entry neighbor format:', str);
                        return null;
                    }
                }).filter(n => n);
                opts.neighbors = [ ...(opts.neighbors ? opts.neighbors : []), ...neighbors ];
                init(opts);
            });
        }
        else {
            init(opts);
        }

    },
    ...node
};
