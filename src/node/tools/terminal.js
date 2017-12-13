const blessed = require('blessed');

var screen = null;

module.exports = {
    init,
    exit
};

function init () {
    screen = blessed.screen({
        smartCSR: true
    });
}

function exit () {
    screen.destroy();
}
