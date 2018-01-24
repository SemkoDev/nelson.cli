'use strict';

var cp = require('child_process');

var _require = require('../node/__mocks__/node'),
    Node = _require.Node;

/**
 * Initializes a mocked node with given options
 * @param {object} options - see Node options for details.
 * @returns {Promise<Node>}
 */


function initMockedNode(options) {
    var node = new Node(options);
    return node.start().then(function (n) {
        n.log('initialized!');
        return node;
    });
}

/**
 * Spawns a node process
 * @param {object} options
 */
function spawnNode() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var silent = arguments[1];

    var opts = [];
    options.port && opts.push('-p') && opts.push('' + options.port);
    options.isMaster && opts.push('--master');
    options.IRIProtocol && opts.push('--IRIProtocol') && opts.push(options.IRIProtocol);
    options.neighbors && options.neighbors.length && opts.push('-n') && opts.push('' + options.neighbors.join(' '));
    options.silent && opts.push('-s');
    options.cycleInterval && opts.push('-c') && opts.push('' + options.cycleInterval);
    options.epochInterval && opts.push('-e') && opts.push('' + options.epochInterval);
    return cp.fork(__dirname + '/bin/nelson.js', opts, { silent: silent });
}

module.exports = {
    spawnNode: spawnNode,
    initMockedNode: initMockedNode
};