const request = require('request');
const { getNodeStats } = require('./node');

function startWebhooks (node, webhooks, webhookInterval) {
    const interval = setInterval(() => {
        webhooks.forEach((uri) => request({
            uri,
            method: 'POST',
            json: getNodeStats(node)
        }, (err) => {
            if (err) {
                node.log(`Webhook returned error: ${uri}`.yellow);
            }
        }));
    }, webhookInterval * 1000);
    return {
        stop: () => { clearInterval(interval) }
    }
}

module.exports = {
    startWebhooks
};
