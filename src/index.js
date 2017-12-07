const node = require('./node').node;

// Some general TODOs:
// TODO: add changelog/history
// TODO: add linting
// TODO: add editor config

module.exports = {
    initNode: (opts) => {
        const _node = new node.Node(opts);
        const terminate = () => _node.end().then(() => process.exit(0));

        process.on('SIGINT', terminate);
        process.on('SIGTERM', terminate);

        _node.start().then((n) => {
            n.log('initialized!');
        });
    },
    ...node
};
