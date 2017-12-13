const version = require('../../../package.json').version;
const crypto = require('crypto');
const md5 = require('md5');

/**
 * Returns number of seconds that passed starting from a given time.
 * @param time
 * @returns {number}
 */
function getSecondsPassed (time) {
    if (!time) {
        return 0;
    }
    return ((new Date()).getTime() - time.getTime()) / 1000
}

/**
 * Creates a random 96-char-long hexadecimal identifier.
 * @returns {string}
 */
function createIdentifier () {
    return crypto.randomBytes(48).toString('hex')
}

/**
 * Creates an MD5 hash from the given address
 * @param {string} address
 * @returns {string}
 */
function getPeerIdentifier (address) {
    return md5(address)
}

/**
 * Returns a random number
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

/**
 * Shuffles the array
 * @param {Array} array
 * @returns {Array}
 */
function shuffleArray (array) {
    return array.sort(() => Math.random() - 0.5)
}

/**
 * Returns Nelson version number
 */
function getVersion () {
    return version;
}

/**
 * Returns whether the provided version number is the same major version as the current Nelson.
 * @param {string} otherVersion
 */
function isSameMajorVersion (otherVersion) {
    return version.split('.')[0] === otherVersion.split('.')[0]
}

module.exports = {
    createIdentifier,
    getPeerIdentifier,
    getRandomInt,
    getSecondsPassed,
    getVersion,
    isSameMajorVersion,
    shuffleArray
};
