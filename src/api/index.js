const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const basicAuth = require('express-basic-auth');

const { getNodeStats, getSummary } = require('./node');
const { getPeerStats } = require('./peer');
const { startWebhooks } = require('./webhooks');

const DEFAULT_OPTIONS = {
    node: null,
    webhooks: [],
    webhookInterval: 30,
    username: null,
    password: null,
    apiPort: 18600,
    apiHostname: '127.0.0.1'
};

/**
 * Creates an Express APP instance, also starts regular webhooks callbacks.
 * @param options
 * @returns {*|Function}
 */
function createAPI (options) {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Start webhook callbacks
    if (opts.webhooks && opts.webhooks.length) {
        startWebhooks(opts.node, opts.webhooks, opts.webhookInterval)
    }

    // Start API server
    const app = express();
    app.set('node', opts.node);

    // Basic app protection
    app.use(helmet());

    // Enable basic HTTP Auth
    if (opts.username && opts.password) {
        app.use(basicAuth({
            users: { [opts.username]: opts.password }
        }))
    }

    // parse application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({ extended: false }));

    // parse application/json
    app.use(bodyParser.json());

    //////////////////////// ENDPOINTS ////////////////////////

    app.get('/', (req, res) => {
        res.json(getNodeStats(opts.node))
    });

    app.get('/peer-stats', (req, res) => {
        res.json(getSummary(opts.node))
    });

    app.get('/peers', (req, res) => {
        res.json(opts.node.list.all().map(getPeerStats))
    });

    return app.listen(opts.apiPort, opts.apiHostname);
}

module.exports = {
    createAPI,
    DEFAULT_OPTIONS
};
