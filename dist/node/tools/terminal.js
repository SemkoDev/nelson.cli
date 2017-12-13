'use strict';

var blessed = require('blessed');
require('colors');
var moment = require('moment');

var screen = null;
var mainBox = null;
var statusBox = null;
var peersBox = null;

module.exports = {
    init: init,
    exit: ensureScreen(exit),
    log: log,
    beat: ensureScreen(beat),
    settings: ensureScreen(settings),
    ports: ensureScreen(ports),
    nodes: ensureScreen(nodes)
};

function init(version, onExit) {
    screen = blessed.screen({
        smartCSR: true
    });
    screen.key(['escape', 'q', 'C-c'], function () {
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
        width: '50%',
        height: '50%',
        content: ('Nelson v.' + version + ' - Status').green.bold,
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
        height: '50%',
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

    screen.append(mainBox);
    screen.append(statusBox);
    screen.append(peersBox);
    mainBox.focus();
    screen.render();
}

function log() {
    var msg = Array.from(arguments).join(' ');
    if (!screen) {
        console.log(msg);
        return;
    }
    mainBox.pushLine(msg);
    mainBox.setScrollPerc(100);
    screen.render();
}

function beat(epoch, cycle, startDate) {
    var now = moment();
    var diffDays = now.diff(startDate, 'days');
    var diffHours = now.diff(startDate, 'hours');
    var diffMinutes = now.diff(startDate, 'minutes');
    var days = '' + (diffDays > 0 ? diffDays + ' days ' : '');
    var hours = '' + (diffHours > 0 ? diffHours + ' hours ' : '');
    statusBox.setLine(3, ('Online: ' + days + hours + diffMinutes + ' minutes').bold.yellow);
    statusBox.setLine(4, ('Epoch: ' + epoch).bold);
    statusBox.setLine(5, ('Cycle: ' + cycle).bold);
    screen.render();
}

function settings(_ref) {
    var epochInterval = _ref.epochInterval,
        cycleInterval = _ref.cycleInterval,
        startDate = _ref.startDate;

    var startDateString = moment(startDate).format('dddd, MMMM Do YYYY, HH:mm:ss.SSS');
    statusBox.setLine(2, ('Started on: ' + startDateString).yellow);
    statusBox.setLine(6, 'Epoch Interval: ' + epochInterval + 's');
    statusBox.setLine(7, 'Cycle Interval: ' + cycleInterval + 's');
    screen.render();
}

function ports(_ref2) {
    var port = _ref2.port,
        apiPort = _ref2.apiPort,
        IRIPort = _ref2.IRIPort,
        TCPPort = _ref2.TCPPort,
        UDPPort = _ref2.UDPPort;

    statusBox.setLine(8, ('Port: ' + port).dim.cyan);
    statusBox.setLine(9, ('API Port: ' + apiPort).dim.cyan);
    statusBox.setLine(10, ('IRI Port: ' + IRIPort).dim.cyan);
    statusBox.setLine(11, ('TCP Port: ' + TCPPort).dim.cyan);
    statusBox.setLine(12, ('UDP Port: ' + UDPPort).dim.cyan);
    screen.render();
}

function nodes(_ref3) {
    var nodes = _ref3.nodes,
        connected = _ref3.connected;

    peersBox.setLine(2, ('Count: ' + nodes.length).bold);
    peersBox.setLine(4, 'Connections:'.bold);
    if (!Array.isArray(connected) || connected.length === 0) {
        peersBox.setLine(5, 'do not worry, this may take a while...'.dim);
    } else {
        // TODO: clear lines first!! may lead to debris otherwise.
        connected.forEach(function (connection, i) {
            var id = ((connection.hostname || connection.ip) + ':' + connection.port).bold.cyan;
            var weight = ('[weight: ' + connection.weight + ']').green;
            peersBox.setLine(5 + i, id + ' ' + weight);
        });
    }
    screen.render();
}

function ensureScreen(f) {
    return function () {
        if (!screen) {
            return;
        }
        return f.apply(undefined, arguments);
    };
}

function exit() {
    screen.destroy();
    screen = null;
}