# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Readme info on pm2 manager and docker volume mounting.

### Changes
- Makes Nelson ignore static neighbors completely, even if they run Nelson as well.

## [0.2.3] - 2017-12-19

### Added
- Ansible playbook for Nelson

### Changed
- README docker ports for IRI
- Terminal: prevent box overlapping

## [0.2.2] - 2017-12-18

### Adds
- peer-stats to API
- Checking of NELSON_CONFIG env var for configuration path.

## [0.2.1] - 2017-12-18

### Changed
- Fixes getNeighbors when used in config.ini

## [0.2.0] - 2017-12-18

### Added
- Automatic entry nodes list downloading
- IRI healthchecks on startup without throwing an error.
- Actively remove peers, if the limit is trespassed at any point for any reason.
- Improved Dockerfile.

## [0.1.11] - 2017-12-16

### Changed
- Fixes IRI neighbors removal

## [0.1.10] - 2017-12-16

### Changed
- Replacing only incoming nodes with trusted nodes (possible limit breaker)

## [0.1.9] - 2017-12-16

### Changed
- Switched IRI to run in UDP mode due to TCP bugs in IRI. https://github.com/iotaledger/iri/issues/345

## [0.1.8] - 2017-12-16

### Added
- Delayed retry of unavailable peers.

### Changed
- Default IRI API port: 14265
- Epoch time to 15 minutes
- Delayed neighbors remove from IRI (prevent orphans)

### Removed
- Removed instant drops after handshake due to oft reconnects (moved into handshake)

## [0.1.7] - 2017-12-15

### Changed
- DNS resolve hostnames provided by IRI in health checks.

## [0.1.6] - 2017-12-15

### Changed
- Improved logs
- Fixed orphaned IRI neighbors

## [0.1.5] - 2017-12-14

### Changed
- Improved connection strategy to minimize reconnects.
- Improved incoming connection strategy to minimize dead nodes.

## [0.1.4] - 2017-12-13

### Added
- Fixed IRI health checks

## [0.1.3] - 2017-12-13

### Added
- Terminal GUI for Nelson
- IRI health checks

### Changed
- Cleaned up logs (double-removals of peers)
- Minor bugfixes.


## [0.1.1] - 2017-12-13

### Added
- Option for setting nelson api listening hostname.

### Changed
- Cleaned Docker README section.
- Cleaned up logs (double-removals of peers)

## [0.1.0] - 2017-12-13

### Added
- setting of IRI's hostname

### Changed
- Dockerfile to use specific nelson version
- Readme about docker

## [0.0.7] - 2017-12-13

### Added
- Adds API versioning: drop connections from other major versions

### Changed
- Fixes neighbors default port setting

## [0.0.6] - 2017-12-12
- improve console log visualization
- added Dockerfile

## [0.0.5] - 2017-12-12

### Changed
- Dynamic openness in function with node's maturity.
- Sharing of opinion about neighbours.
- Implemented improved weighting from tri-tests.
- Decreased the average number of connected nodes to 8 (+/-4).


## [0.0.4] - 2017-12-09

### Added
- Contributing message

### Changed
- forgotten dist and bin updates for 0.0.3

## [0.0.3] - 2017-12-09

### Added
- Command line params for incoming/outgoing slots count.

### Changed
- How master nodes recycle peers (all) and treat outgoing connections.

## [0.0.2] - 2017-12-08

### Added
- Changelog
- Nelson API server for status updates incl README part

### Changed
- Nelson API default port to 18600


## [0.0.1] - 2017-12-06
Initial version
