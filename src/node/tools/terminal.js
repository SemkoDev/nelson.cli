const blessed = require('blessed');
const contrib = require('blessed-contrib');
require('colors');
const moment = require('moment');
const momentDurationFormatSetup = require("moment-duration-format");

momentDurationFormatSetup(moment);

var screen = null;
var mainBox = null;
var statusBox = null;
var peersBox = null;
var progress = null;

module.exports = {
    init,
    exit: ensureScreen(exit),
    log: log,
    beat: ensureScreen(beat),
    settings: ensureScreen(settings),
    ports: ensureScreen(ports),
    nodes: ensureScreen(nodes)
};

function init (version, onExit) {
    screen = blessed.screen({
        smartCSR: true
    });
    screen.key(['escape', 'q', 'C-c'], function() {
        exit();
        return onExit();
    });

    mainBox = blessed.box({
        top: '50%',
        left: 'center',
        width: '100%',
        height: '50%',
        content: 'Nelson Console:',
        scrollable: true,
        alwaysScroll: true,
        tags: true,
        border: {
            type: 'line'
        },
        style: {
            fg: 'white',
            border: {
                fg: '#f0f0f0'
            }
        }
    });

    statusBox = blessed.box({
        top: '0%',
        left: '0%',
        width: '30%',
        height: '51%',
        content: `Nelson v.${version} - Status`.green.bold,
        tags: true,
        border: {
            type: 'line'
        },
        style: {
            fg: 'white',
            border: {
                fg: '#f0f0f0'
            }
        }
    });

    peersBox = blessed.box({
        top: '0%',
        left: '50%',
        width: '51%',
        height: '51%',
        content: 'Peers'.green.bold,
        tags: true,
        border: {
            type: 'line'
        },
        style: {
            fg: 'white',
            border: {
                fg: '#f0f0f0'
            }
        }
    });

    progress = contrib.donut({
        top: '0%',
        left: '30%',
        width: '21%',
        height: '51%',
        radius: 8,
        arcWidth: 3,
        remainColor: 'black',
        yPadding: 2,
        border: {
            type: 'line'
        },
        style: {
            fg: 'white',
            border: {
                fg: '#f0f0f0'
            }
        }
    });

    screen.append(mainBox);
    screen.append(statusBox);
    screen.append(peersBox);
    screen.append(progress);
    mainBox.focus();
    screen.render();
}

function log () {
    const msg = Array.from(arguments).join(' ');
    if (!screen) {
        console.log(msg);
        return;
    }
    mainBox.pushLine(msg);
    mainBox.setScrollPerc(100);
    screen.render();
}

function beat ({ epoch, cycle, startDate, pctEpoch, pctCycle }) {
    const duration = moment.duration(moment().diff(startDate)).format('d [days] h [hours] m [minutes]');
    statusBox.setLine(3, `Online: ${duration}`.bold.yellow);
    statusBox.setLine(4, `Epoch: ${epoch}`.bold);
    statusBox.setLine(5, `Cycle: ${cycle}`.bold);
    progress.setData([
        {percent: pctEpoch, label: 'epoch', color: 'green'},
        {percent: pctCycle, label: 'cycle', color: 'green'}
    ]);
    screen.render();
}

function settings ({ epochInterval, cycleInterval, startDate }) {
    const startDateString = moment(startDate).format('dddd, MMMM Do YYYY, HH:mm:ss.SSS');
    statusBox.setLine(2, `Started on: ${startDateString}`.yellow);
    statusBox.setLine(6, `Epoch Interval: ${epochInterval}s`);
    statusBox.setLine(7, `Cycle Interval: ${cycleInterval}s`);
    screen.render();
}

function ports ({ port, apiPort, IRIPort, TCPPort, UDPPort }) {
    statusBox.setLine(8, `Port: ${port}`.dim.cyan);
    statusBox.setLine(9, `API Port: ${apiPort}`.dim.cyan);
    statusBox.setLine(10, `IRI Port: ${IRIPort}`.dim.cyan);
    statusBox.setLine(11, `TCP Port: ${TCPPort}`.dim.cyan);
    statusBox.setLine(12, `UDP Port: ${UDPPort}`.dim.cyan);
    screen.render();
}

function nodes ({ nodes, connected }) {
    peersBox.setLine(2, `Count: ${nodes.length}`.bold);
    peersBox.setLine(4, `Connections:`.bold);
    const lines = peersBox.getLines().length;
    for (let i = lines -1; i >= 5; i--) {
        peersBox.clearLine(i)
    }
    if (!Array.isArray(connected) || connected.length === 0) {
        peersBox.setLine(5, 'do not worry, this may take a while...'.dim);
    }
    else {
        connected.forEach((connection, i) => {
            const id = `${connection.hostname||connection.ip}:${connection.port}`.bold.cyan;
            const weight = `[weight: ${connection.weight}]`.green;
            peersBox.setLine(5 + i, `${id} ${weight}`);
        });
    }
    screen.render();
}

function ensureScreen (f) {
    return function () {
        if (!screen) {
            return;
        }
        return f(...arguments);
    }
}

function exit () {
    screen.destroy();
    screen = null;
}
