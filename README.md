# CarrIOTA Nelson

Nelson is a tool meant to be used with IOTA's IRI Node.
It automatically manages neighbors of your full node, negotiating connections,
finding new neighbors and protecting against bad actors.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine.

### Prerequisites

It is expected that you have already installed Java, downloaded the IRI jar file
and know how to start it. The local IRI instance must have api enabled and allowing to add/remove neighbors.

Nelson is running on Node.js You will have to install **node (at least version LTS 6.9.1)** and *npm* (node package manager) on your system.
Alternatively to npm you can (and should) use yarn package manager.

### Installing

Globally install Nelson

```
npm install -g nelson.cli
```

And run it

```
nelson --gui --getNeighbors
```

The  ```--getNeighbors``` option is used to download an entry set of trusted Nelson peers for new Nelson instances.
As your Nelson stays online and gets to know its neighbors, it will rely less and less on the initial entry
points.

The  ```--gui``` option is used to provide a simple GUI interface in the console.

Below is the list of all possible options.

## Docker

Provided you have docker installed, Nelson can be started as follows:

```
docker run <docker opts> romansemko/nelson <nelson command line opts>
```

Hence, running IRI with Nelson can be done with two simple commands:
```
docker run -d --net host -p 14265:14265 --name iri iotaledger/iri
docker run -d --net host -p 18600:18600 --name nelson romansemko/nelson -r localhost -i 14265 -u 14600 -t 15600 --neighbors "mainnet.deviota.com/16600 mainnet2.deviota.com/16600 mainnet3.deviota.com/16600 iotairi.tt-tec.net/16600"
```

The options passed to Nelson's docker (```-r localhost -i 14265 -u 14600 -t 15600 --neighbors ...```) set IRI's
hostname and ports (api, TCP, UDP) and the initial neighbors (You could also have used ```--getNeighbors```).
Please refer below for more info on options.

## Building Locally

If you are a developer you may want to build the project locally and play around with the sources.
Otherwise, ignore this section.
Make sure you have yarn package manager installed.
Checkout the project:

```
git clone https://github.com/SemkoDev/nelson.cli.git
cd nelson.cli
```

Install dependencies:

```
yarn install --pure-lockfile
```

Run tests and make binaries:

```
yarn make
```

Try to run Nelson:

```
node ./dist/nelson.js --gui --neighbors "mainnet.deviota.com/16600 mainnet2.deviota.com/16600 mainnet3.deviota.com/16600 iotairi.tt-tec.net/16600"
```

## Configuration

You are free to either use command line options or an ```.ini``` file to configure Nelson. If you use a config
file, it has precedence and all command line options are ignored.

### config.ini

To use a configuration file, run Nelson with ```--config``` option:

```
nelson --config ./config.ini

# Alternatively, set an environment variable:
NELSON_CONFIG= ./config.ini nelson
```

You can provide one or more of the following options in your ini file. Example:

```
[nelson]
cycleInterval = 60
epochInterval = 300
apiPort = 18600
apiHostname = 127.0.0.1
port = 16600
IRIHostname = localhost
IRIPort = 14265
TCPPort = 15600
UDPPort = 14600
dataPath = data/neighbors.db
isMaster = false
silent = false
gui = false
getNeighbors = https://raw.githubusercontent.com/SemkoDev/nelson.cli/master/ENTRYNODES
; add as many initial Nelson neighbors, as you like
neighbors[] = mainnet.deviota.com/16600
neighbors[] = mainnet2.deviota.com/16600
neighbors[] = mainnet3.deviota.com/16600
neighbors[] = iotairi.tt-tec.net/16600
```

### Command line options

Command line options are named the same as INI options.
Some have additional short versions.

### Options description

| Option                 |      Description                        | Default |
|------------------------|-----------------------------------------|---------|
| --neighbors, -n |  space-separated list of entry Nelson neighbors ||
| --getNeighbors |  Downloads a list of entry Nelson neighbors. If no URL is provided, will use a default URL (https://raw.githubusercontent.com/SemkoDev/nelson.cli/master/ENTRYNODES). If this option is not set, no neighbors will be downloaded. This option can be used together with ````--neighbors`` |false|
| --apiPort, -a | Nelson API port to request current node status data|18600|
| --apiHostname, -o | Nelson API hostname to request current node status data. Default value will only listen to local connections|127.0.0.1|
| --port, -p | TCP port, on which to start your Nelson instance|16600|
| --IRIHostname, -r| IRI API hostname of the running IRI node instance|localhost|
| --IRIPort, -i| IRI API port of the running IRI node instance|14265|
| --TCPPort, -t| IRI TCP Port|15600|
| --UDPPort, -u| IRI UDP Port|14600|
| --dataPath, -d| path to the file, that will be used as neighbor storage| data/neighbors.db|
| --silent, -s|Run the node without any output||
| --gui, -g|Run the node in console-gui mode||
| --cycleInterval| Interval between Nelson cycles|60|
| --epochInterval| Interval between Nelson epochs|300|
| --isMaster| Whether you are intending to run a master node||

## Running Nelson

### Initial nodes

The neighbors you provide in the beginning are treated as trusted neighbors. This means that Nelson will be more inclined
to accept contact requests from these neighbors and also to recommend them to other neighbors. They are also used as
initial contact for a young Nelson. They provide him with other neighbors' addresses.

### Epochs and Cycles

Nelson grows. And with each new age (epoch), he treats his neighbors differently. A neighbor that he didn't like in the
past, might become his best friend in the new epoch. The epoch option defines the interval in seconds between each epoch
change. Do not change it, unless you know, what you are doing.

Nelson checks upon its neighbors from time to time to make sure they are okay. Sometimes the neighbors die without saying
a word or maybe move somewhere else. Nelson wants to know, with whom he should keep in contact. Each cycle Nelson pings
the neighbors, to make sure they are okay. You can control the cycle interval with the ```cycleInterval``` option.

### API

Nelson comes with a simple API to get its current status:

```
# Replace the port, if you changed it when starting Nelson:
curl http://localhost:18600

# Answer:
{
    "ready": true,
    "totalPeers": 200,
    "connectedPeers": [
        {
            "hostname": "xxxxxxxxxxxxxxx",
            "ip": "xxxxxxxxxxxxxxxx",
            "port": 16600,
            "TCPPort": 15600,
            "UDPPort": 14600,
            "seen": 1,
            "connected": 50,
            "tried": 0,
            "weight": 0.75,
            "dateTried": "2017-12-18T07:58:10.614Z",
            "dateLastConnected": "2017-12-18T07:58:10.705Z",
            "dateCreated": "2017-12-17T00:07:16.787Z",
            "isTrusted": false,
            "_id": "pOsnVKeGtWufM6AI",
            "nelsonID": "544a0355"
        },
        ...
    ],
    "config": {
        "cycleInterval": 60,
        "epochInterval": 900,
        "beatInterval": 10,
        "dataPath": "/data/neighbors.db",
        "port": 16600,
        "apiPort": 18600,
        "IRIPort": 14265,
        "TCPPort": 15777,
        "UDPPort": 14777,
        "isMaster": false,
        "temporary": false
    },
    "heart": {
        "lastCycle": "2017-12-18T08:10:07.806Z",
        "lastEpoch": "2017-12-18T08:01:02.967Z",
        "personality": {
            "id": "d856113128efbb33d313f7a5bd2c6befa40923544a5ae478613e4ac4c0cd0314341f1b4c6fcc30fd5cfe08a1db709a2f",
            "publicId": "d8561131",
            "feature": "e"
        },
        "currentCycle": 1944,
        "currentEpoch": 130,
        "startDate": "2017-12-16T23:40:04.615Z"
    }
```

You can also get the full list of known peers:

```
curl http://localhost:18600/peers
```

Or short stats about your known peers:

```
curl http://localhost:18600/peers

#Output:
{
    "newNodes": {
        "hourAgo": 43,
        "fourAgo": 275,
        "twelveAgo": 733,
        "dayAgo": 1825,
        "weekAgo": 2466
    },
    "activeNodes": {
        "hourAgo": 133,
        "fourAgo": 463,
        "twelveAgo": 950,
        "dayAgo": 2133,
        "weekAgo": 2257
    }
}
```

## FAQ

### Help! Nelson isn't connecting to neighbors!

Depending on Nelson's age/epoch he might or might not like a certain neighbor. That's okay. Just wait for the neighbor
to mature and he might accept you into his circle.

This is more acute for new nodes without any neighbors at all. 
You might need to wait for quite some time to be accepted into the network.

The same happens to your own Nelson instance. It might deny contact from new neighbors or those he doesn't know well.
The less trusted and less known a neighbor is, the less likely your Nelson will contact him. This is a security measure
to slowly structure the network and give more weight to old, trusted neighborhood. You can read more about it in the
Nelson's release article: https://medium.com/deviota/carriota-nelson-in-a-nutshell-1ee5317d8f19

### Nelson is still not connecting!

Make sure that Nelson's port (default: 16600) is not firewalled.

### Nelson connects to the neighbors, but I am not getting any transactions

Make sure that you provided the correct TCP/UDP IRI ports to Nelson. If your ports differ from the defaults
(TCP: 15600 and UDP: 14600) you have to provide them!

### Nelson constantly connects/disconnects

Nelson generates a lot of log output. Each handshake try and fail generates at least 3 lines of logs:

- Connecting
- Closing connection
- Removing neighbor from IRI (although non has been added, yet).

This is Normal.

### I have too many neighbors

Nelson adds up to 10/11 additional neighbors. If you have a lot of "manual" neighbors, this might be too much.

### I am getting an error:

```
 usr/bin/env: »node“ Unknown command...
```

Make sure you have node v.6.9.1 or higher installed on your machine.

### I am getting an error:

```
module.exports = (externalConfig = {}) => {
                                ^

SyntaxError: Unexpected token =
   at exports.runInThisContext (vm.js:53:16)
   at Module._compile (module.js:374:25)
   at Object.Module._extensions..js (module.js:417:10)
   at Module.load (module.js:344:32)
   at Function.Module._load (module.js:301:12)
   at Module.require (module.js:354:17)
   at require (internal/module.js:12:17)
   at Object.<anonymous> (/usr/local/lib/node_modules/nelson.cli/node_modules/external-ip/index.js:2:18)
   at Module._compile (module.js:410:26)
   at Object.Module._extensions..js (module.js:417:10)
```
Your node version is outdated. Make sure you have node v.6.9.1 or higher installed on your machine.

## Monitor
There is a simple Nelson http server/monitor available at: https://github.com/SemkoDev/nelson.mon
This is work in progress, so please bear with the simplicity.

## Authors

* **Roman Semko** - *SemkoDev* - (https://github.com/romansemko)
* **Vitaly Semko** - *SemkoDev* - (https://github.com/witwit)

## License

This project is licensed under the ICS License - see the [LICENSE.md](LICENSE.md) file for details

## Contributing

### Donations

**Donations always welcome**: 

```
IQJGHISHRMV9LEAEMSUIXMFTLLZIJWXIQOAZLGNXCFY9BLPTFTBNBPGU9YQFQKC9GEBPNNFO9DMGKYUECCG9ZSHMRW
```

### Running your own entry node

As the network grows, we will need more entry nodes. These "master" nodes serve as gates to the
network for new nodes. They accept slightly more connections and do not actively connect to others.
The entry nodes only share info about the nodes that have contacted them sometime in the past.

You can run a master node by adding these options to Nelson:

```
--isMaster --epochInterval 180
```
The first value tells Nelson to run in "master" mode. The second decreases the epoch time so that
the connected nodes are rotated faster, giving space to new nodes.

You can contact the maintainer of this repo (http://www.twitter.com/RomanSemko) to get your node
included here. An initiative for donations to entry nodes is under way. 

## TODO

There are some open TODO's in the source code. Most urging are:

- node tests: tested using simulation tools (will be published separately), but some Jest tests would be nice.
- structural/organizational work: linting, editor config, contributions specs
- Throttling of incoming requests.
- Load balancing: running a Nelson swarm behind a balancer. How?
- Use static IDs to identify nodes instead of static IPs. Need something similar to public/private keys sharing.
- etc.?

Any help welcome!
