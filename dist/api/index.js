'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var express = require('express');
var helmet = require('helmet');
var bodyParser = require('body-parser');
var basicAuth = require('express-basic-auth');

var _require = require('./node'),
    getNodeStats = _require.getNodeStats,
    getSummary = _require.getSummary;

var _require2 = require('./peer'),
    getPeerStats = _require2.getPeerStats;

var _require3 = require('./webhooks'),
    startWebhooks = _require3.startWebhooks;

var DEFAULT_OPTIONS = {
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
function createAPI(options) {
    var opts = _extends({}, DEFAULT_OPTIONS, options);

    // Start webhook callbacks
    if (opts.webhooks && opts.webhooks.length) {
        startWebhooks(opts.node, opts.webhooks, opts.webhookInterval);
    }

    // Start API server
    var app = express();
    app.set('node', opts.node);

    // Basic app protection
    app.use(helmet());

    // Enable basic HTTP Auth
    if (opts.username && opts.password) {
        app.use(basicAuth({
            users: _defineProperty({}, opts.username, opts.password)
        }));
    }

    // parse application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({ extended: false }));

    // parse application/json
    app.use(bodyParser.json());

    //////////////////////// ENDPOINTS ////////////////////////

    app.get('/', function (req, res) {
        res.json(getNodeStats(opts.node));
    });

    app.get('/peer-stats', function (req, res) {
        res.json(getSummary(opts.node));
    });

    app.get('/peers', function (req, res) {
        res.json(opts.node.list.all().map(getPeerStats));
    });

    return app.listen(opts.apiPort, opts.apiHostname);
}

module.exports = {
    createAPI: createAPI,
    DEFAULT_OPTIONS: DEFAULT_OPTIONS
};