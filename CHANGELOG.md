# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2018-02-03

### Added

-   API basic HTTP auth

### Changed

-   Fixed orphaned neighbors check.
-   Fixed API security bug.

## [0.3.22] - 2018-01-29

### Changed

-   Fixed tests on some systems that were failing.
-   Upgraded IOTA IRI JS Library to 0.4.7

## [0.3.21] - 2018-01-24

### Added

-   Additional entry nodes
-   Possible fix for #45 ECONNRESET error
-   Interval-compression of the neighbors database
-   IRI cleanup of neighbors. Possible fix for #50
-   Additional Peer and PeerList tests. Fixes #43
-   Guard tests
-   Basic node tests
-   Node network integration tests
-   Basic node network simulation package
-   Parts of the node simulation package for integration tests

### Changed

-   Upgraded minimal node version to 8.9.4
-   Cleanup nelson on uncaught exception. Possible fix for #50
-   Upgrades WebSockets to 4.0.0. Possible fix for #45
-   Fixed docker to copy faster, ignoring unneeded files
-   Made docker run the tests while building

## [0.3.16] - 2018-01-09

### Changed

-   Fixed IRI TCP negotiation bug #5

## [0.3.15] - 2018-01-09

### Changed

-   Fixed IRI TCP negotiation bug #4
-   Removed binaries from the versioning
-   Fixed terminal display

## [0.3.12] - 2018-01-06

### Changed

-   Fixed IRI TCP negotiation bug #3

## [0.3.11] - 2018-01-06

### Changed

-   Fixed IRI TCP negotiation bug #2

## [0.3.9] - 2018-01-06

### Changed

-   Fixed IRI TCP negotiation bug

## [0.3.8] - 2018-01-06

### Added

-   IRI protocol negotiation between nodes

### Changed

-   Fixed ECONNRESET bug.

## [0.3.5] - 2018-01-02

### Changed

-   Fixes IPv6 check

## [0.3.4] - 2018-01-02

### Changed

-   Fixed removed static neighbors on exit.
-   Fixed possible neighbor leak in IRI.
-   Fixes IPv6 URIs.
-   Updated Dockerfile to make the build faster.

## [0.3.1] - 2018-01-02

### Added

-   TCP switch for IRI

### Changed

-   Improved neighbor weighting algorithm. Fixed a few minor bugs.
-   Smarter neighbor quality algorithm.
-   Random peer dropping inversely-weighted by peer quality now.
-   Improved incoming new/top peer rules.
-   Restructured and cleaned up the README.
-   Increased default minimal neighbors back to 5+6 (11) for stronger security.

## [0.3.0] - 2017-12-27

### Added

-   IRI info to the API.
-   Webhooks.
-   Dynamic IP support.
-   Node naming.
-   Temporarily penalizing lazy/broken neighbors.

### Changed

-   Access to the whole peer list only from local requests.
-   Fixes trust updating issues.

## [0.2.5] - 2017-12-21

### Added

-   Request throttling guard.
-   Made incoming/outgoing limits public.
-   Warnings when setting too low incoming/outgoing limits.

### Changed

-   Updated iota.lib.js
-   Fixes hard limits for nodes.
-   Lowers the amount of minimum nodes to 9
-   Limited the amount of recommended/shared nodes.
-   Allowed cross-origin requests to API.

## [0.2.4] - 2017-12-19

### Added

-   Readme info on pm2 manager and docker volume mounting.

### Changes

-   Makes Nelson ignore static neighbors completely, even if they run Nelson as well.

## [0.2.3] - 2017-12-19

### Added

-   Ansible playbook for Nelson

### Changed

-   README docker ports for IRI
-   Terminal: prevent box overlapping

## [0.2.2] - 2017-12-18

### Adds

-   peer-stats to API
-   Checking of NELSON_CONFIG env var for configuration path.

## [0.2.1] - 2017-12-18

### Changed

-   Fixes getNeighbors when used in config.ini

## [0.2.0] - 2017-12-18

### Added

-   Automatic entry nodes list downloading
-   IRI healthchecks on startup without throwing an error.
-   Actively remove peers, if the limit is trespassed at any point for any reason.
-   Improved Dockerfile.

## [0.1.11] - 2017-12-16

### Changed

-   Fixes IRI neighbors removal

## [0.1.10] - 2017-12-16

### Changed

-   Replacing only incoming nodes with trusted nodes (possible limit breaker)

## [0.1.9] - 2017-12-16

### Changed

-   Switched IRI to run in UDP mode due to TCP bugs in IRI. https://github.com/iotaledger/iri/issues/345

## [0.1.8] - 2017-12-16

### Added

-   Delayed retry of unavailable peers.

### Changed

-   Default IRI API port: 14265
-   Epoch time to 15 minutes
-   Delayed neighbors remove from IRI (prevent orphans)

### Removed

-   Removed instant drops after handshake due to oft reconnects (moved into handshake)

## [0.1.7] - 2017-12-15

### Changed

-   DNS resolve hostnames provided by IRI in health checks.

## [0.1.6] - 2017-12-15

### Changed

-   Improved logs
-   Fixed orphaned IRI neighbors

## [0.1.5] - 2017-12-14

### Changed

-   Improved connection strategy to minimize reconnects.
-   Improved incoming connection strategy to minimize dead nodes.

## [0.1.4] - 2017-12-13

### Added

-   Fixed IRI health checks

## [0.1.3] - 2017-12-13

### Added

-   Terminal GUI for Nelson
-   IRI health checks

### Changed

-   Cleaned up logs (double-removals of peers)
-   Minor bugfixes.

## [0.1.1] - 2017-12-13

### Added

-   Option for setting nelson api listening hostname.

### Changed

-   Cleaned Docker README section.
-   Cleaned up logs (double-removals of peers)

## [0.1.0] - 2017-12-13

### Added

-   setting of IRI's hostname

### Changed

-   Dockerfile to use specific nelson version
-   Readme about docker

## [0.0.7] - 2017-12-13

### Added

-   Adds API versioning: drop connections from other major versions

### Changed

-   Fixes neighbors default port setting

## [0.0.6] - 2017-12-12

-   improve console log visualization
-   added Dockerfile

## [0.0.5] - 2017-12-12

### Changed

-   Dynamic openness in function with node's maturity.
-   Sharing of opinion about neighbours.
-   Implemented improved weighting from tri-tests.
-   Decreased the average number of connected nodes to 8 (+/-4).

## [0.0.4] - 2017-12-09

### Added

-   Contributing message

### Changed

-   forgotten dist and bin updates for 0.0.3

## [0.0.3] - 2017-12-09

### Added

-   Command line params for incoming/outgoing slots count.

### Changed

-   How master nodes recycle peers (all) and treat outgoing connections.

## [0.0.2] - 2017-12-08

### Added

-   Changelog
-   Nelson API server for status updates incl README part

### Changed

-   Nelson API default port to 18600

## [0.0.1] - 2017-12-06

Initial version
