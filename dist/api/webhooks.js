'use strict';

var request = require('request');

var _require = require('./node'),
    getNodeStats = _require.getNodeStats;

function startWebhooks(node, webhooks, webhookInterval) {
    var interval = setInterval(function () {
        webhooks.forEach(function (uri) {
            return request({
                uri: uri,
                method: 'POST',
                json: getNodeStats(node)
            }, function (err) {
                if (err) {
                    node.log(('Webhook returned error: ' + uri).yellow);
                }
            });
        });
    }, webhookInterval * 1000);
    return {
        stop: function stop() {
            clearInterval(interval);
        }
    };
}

module.exports = {
    startWebhooks: startWebhooks
};