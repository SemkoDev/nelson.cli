const cp = require('child_process');
const { Node } = require('../node/__mocks__/node');

/**
 * Initializes a mocked node with given options
 * @param {object} options - see Node options for details.
 * @returns {Promise<Node>}
 */
function initMockedNode (options) {
    const node = new Node(options);
    return node.start().then((n) => {
        n.log('initialized!');
        return node;
    });
}

/**
 * Spawns a node process
 * @param {object} options
 */
function spawnNode(options={}, silent) {
    let opts = [];
    options.port && opts.push('-p') && opts.push(`${options.port}`);
    options.isMaster && opts.push(`--master`);
    options.IRIProtocol && opts.push(`--IRIProtocol`) && opts.push(options.IRIProtocol);
    options.neighbors && options.neighbors.length && opts.push('-n') && opts.push(`${options.neighbors.join(' ')}`);
    options.silent && opts.push('-s');
    options.cycleInterval && opts.push('-c') && opts.push(`${options.cycleInterval}`);
    options.epochInterval && opts.push('-e') && opts.push(`${options.epochInterval}`);
    return cp.fork(`${__dirname}/bin/nelson.js`, opts, { silent });
}

module.exports = {
    spawnNode,
    initMockedNode
};
