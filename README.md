# CarrIOTA Nelson

Nelson is a tool meant to be used with IOTA's IRI Node.
It automatically manages neighbors of your full node, negotiating connections,
finding new neighbors and protecting against bad actors.

## Table of contents

  * [Getting Started](#getting-started)
    * [Prerequisites](#prerequisites)
    * [Installing](#installing)
    * [Upgrading](#upgrading)
    * [Running as a service](#running-as-a-service)
  * [Docker](#docker)
  * [Building Locally](#building-locally)
  * [Configuration](#configuration)
    * [config.ini](#config.ini)
    * [Command line options](#command-line-options)
    * [Options description](#options-description)
  * [Automated Scripts](#automated-scripts)
    * [Amazon CloudFormation](#amazon-cloudformation)
  * [Running Nelson](#running-nelson)
    * [Initial nodes](#initial-nodes)
    * [Epochs and Cycles](#epochs-and-cycles)
    * [Monitor](#monitor)
    * [API](#api)
    * [Webhooks](#webhooks)
  * [FAQ](#faq)
  * [Contributing](#contributing)
    * [Donations](#donations)
    * [Running your own entry node](#running-your-own-entry-node)
  * [Authors](#authors)
  * [License](#license)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine.

### Prerequisites

It is expected that you have already installed Java, downloaded the IRI jar file
and know how to start it. The local IRI instance must have api enabled and allowing to add/remove neighbors.

Nelson is running on Node.js You will have to install **node (at least version LTS 8.9.4)** and *npm* (node package manager) on your system.
Alternatively to npm you can (and should) use yarn package manager.

#### Port Forwarding

If you are trying to run a Nelson node at home, you may need to open some ports (port forwarding) in your NAT Router:

* **UDP 14600**
* **TCP 15600**
* **TCP 16600**

Please refer to your Router's manual on how to do that.

Furthermore, please be aware that apart of firewall and port-forwarding in router, your Internet provider may also be an issue.
Some providers (like Vodafone in Germany) do not have enough IPv4 addresses for homes and
thus use something called "**IPv4 over DS Lite**". In those cases the **traffic will not come through** over the ports
mentioned above. Unfortunately, there is no quick fix for this issue (maybe changing providers).
There is some hope with the upcoming PCP-protocol, this will not happen this year (2018) for most providers, though.

#### WARNING FOR UBUNTU

Ubuntu 16.04 apt comes with an **outdated Node version (4.X)**. You need to install the latest version separately:

https://nodejs.org/en/download/package-manager/

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

### Upgrading

To upgrade your Nelson to version X.X.X, simply run:
```
npm install -g nelson.cli@x.x.x
```

**Please check where npm installs your global packages**! It happens very often that the first installed binary
is put into ```/usr/local/bin``` and the updated into ```/usr/bin```. Run ```nelson --version``` after the upgrade
to make sure you are using the most recent one. Update your scripts and/or services to point to the right binary!

### Running as a service

You can use the [node process manager](http://pm2.keymetrics.io/) to run Nelson as a service.
Just do the following:
```
# Install the process manager:
npm install pm2 -g

# Make pm2 start at startup:
pm2 startup

# Start the Nelson as service
# If you created a nelson config somewhere on your system, provide the path to the config:
pm2 start nelson -- --config /path/to/nelson-config.ini

# Otherwise you can just do: pm2 start nelson

# Save current processes runing with pm2 to startup on boot:
pm2 save

# Get Nelson logs:
pm2 monit
# or
pm2 log
```

## Docker

Provided you have docker installed, Nelson can be started as follows:

```
docker run <docker opts> romansemko/nelson.cli <nelson command line opts>
```

Hence, running IRI with Nelson can be done with two simple commands:
```
docker run -d --net host -p 14265:14265 --name iri iotaledger/iri
docker run -d --net host -p 18600:18600 --name nelson romansemko/nelson.cli -r localhost -i 14265 -u 14777 -t 15777 --neighbors "mainnet.deviota.com/16600 mainnet2.deviota.com/16600 mainnet3.deviota.com/16600 iotairi.tt-tec.net/16600"
```

The options passed to Nelson's docker (```-r localhost -i 14265 -u 14600 -t 15600 --neighbors ...```) set IRI's
hostname and ports (api, TCP, UDP) and the initial neighbors (You could also have used ```--getNeighbors```).
Please refer below for more info on options.

To keep Nelson's peer database outside of the container, so that you do not lose your collected neighbor's data,
you can mount a volume bound to a host's folder:

```
docker run -d --net host -p 18600:18600 --name nelson -v /path/to/nelson/data/directory:/data romansemko/nelson.cli 
```

## Building Locally

If you are a developer you may want to build the project locally and play around with the sources.
Otherwise, ignore this section.
Make sure you have [yarn](https://yarnpkg.com) package manager installed.
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
node ./dist/nelson.js --gui --getNeighbors
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
name = My Nelson Node
cycleInterval = 60
epochInterval = 300
apiAuth = username:password
apiPort = 18600
apiHostname = 127.0.0.1
port = 16600
IRIHostname = localhost
IRIProtocol = any
IRIPort = 14265
TCPPort = 15600
UDPPort = 14600
dataPath = data/neighbors.db
; maximal incoming connections. Please do not set below this limit:
incomingMax = 5
; maximal outgoing connections. Only set below this limit, if you have trusted, manual neighbors:
outgoingMax = 4
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

#### WARNING ON NEIGHBORS:

These are **NOT IRI neighbor** addresses, but the **Nelson** addresses. If you have used them erroneously
as Nelson addresses in the past, chances are that Nelson will think these "static" neighbors are his and
will keep removing them from IRI.

To Fix this, just delete data/neighbors.db and start Nelson fresh with just ```--getNeighbors```

### Command line options

Command line options are named the same as INI options.
Some have additional short versions.

### Options description

| Option                 |      Description                        | Default |
|------------------------|-----------------------------------------|---------|
| --name |  Name your node. This identifier will appear in API/webhooks and for your neighbors ||
| --neighbors, -n |  space-separated list of entry Nelson neighbors ||
| --getNeighbors |  Downloads a list of entry Nelson neighbors. If no URL is provided, will use a default URL (https://raw.githubusercontent.com/SemkoDev/nelson.cli/master/ENTRYNODES). If this option is not set, no neighbors will be downloaded. This option can be used together with ````--neighbors`` |false|
| --apiAuth| Add basic HTTP auth to API. Provide username and password in `user:pass` format||
| --apiPort, -a | Nelson API port to request current node status data|18600|
| --apiHostname, -o | Nelson API hostname to request current node status data. Default value will only listen to local connections|127.0.0.1|
| --port, -p | TCP port, on which to start your Nelson instance|16600|
| --webhooks, -w | List of URLS to regularly call back with the current node status data||
| --webhookInterval | Interval in seconds between each webhook call|30|
| --IRIHostname, -r| IRI API hostname of the running IRI node instance|localhost|
| --IRIPort, -i| IRI API port of the running IRI node instance|14265|
| --TCPPort, -t| IRI TCP Port|15600|
| --UDPPort, -u| IRI UDP Port|14600|
| --IRIProtocol| Protocol to use for connecting neighbors. Possible values **'any'**, **'preferudp'**, **'prefertcp'**, **'udp'**, **'tcp'**. **WARNING**: Please only use with IRI v.1.4.1.6 and do not set to **udp** or **tcp** unless you are 100% sure that you cannot accept other protocol connections in no circumstances. Otherwise, setting **udp** will categorically deny connections from **tcp**-only hosts and vice-versa. **Durung the upgrade phase** setting to **tcp** will probably make your node unreachable as all of the older Nelson version nodes will be running **udp** only! Preferably set **preferudp** or **prefertcp**. "**any**" is always the best choice.  |any|
| --dataPath, -d| path to the file, that will be used as neighbor storage| data/neighbors.db|
| --silent, -s|Run the node without any output||
| --gui, -g|Run the node in console-gui mode||
| --cycleInterval| Interval between Nelson cycles|60|
| --epochInterval| Interval between Nelson epochs|300|
| --isMaster| Whether you are intending to run a master node||
| --incomingMax| How many incoming connections to accept. Please do not set below the default value!|5|
| --outgoingMax| How many active/outgoing connections to establish. Please do not set below the default value, if you do not have any static/manual neighbors!|4|
| --lazyLimit| After how many seconds a new Neighbors without new transactions should be dropped |300|
| --lazyTimesLimit| After how many consecutive connections from a consistently lazy neighbor, should it be penalized |3|

## Automated Scripts

### Amazon CloudFormation

Thanks to [iotFab](https://github.com/iotFab) for creating the [cloudformation script](https://github.com/iotFab/iota-aws-full-node) to easily launch IRI+Nelson!
If You have an AWS account, you can launch a new full node in a matter of few clicks: 

[![alt text](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home?region=eu-west-1#/stacks/new?stackName=IotaAwsFullNode&templateURL=https://s3-eu-west-1.amazonaws.com/nelson-iri/cloudformation.yml)

1. Make sure "Specify an Amazon S3 template URL" is checked and continue.
2. Click continue. You can leave all config with default values.
3. If you want to be able to access your instance, you will need to provide a keypair. This is not required, though.
4. Wait about 10 for the instance to launch.
5. Done!

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

### Monitor
There is a simple [Nelson server/monitor](https://github.com/SemkoDev/nelson.gui) available at: https://github.com/SemkoDev/nelson.gui
This is work in progress, so please bear with the simplicity.

You might need to run your nelson.cli with ```--apiHostname 0.0.0.0``` so that the monitor web-app has 
access to the Nelson API server.

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

Or just the short stats about your known peers:

```
curl http://localhost:18600/peer-stats

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

if you use `apiAuth` option to protect your API, you will need to provide the authentication details
in your requests:

```
curl -u username:password http://localhost:18600
```

### Webhooks

You can provide Nelson a list of webhook URLs that have to be regularly called back with all the node stats data.
It basically provides the same data as calling ```curl http://localhost:18600/``` API.

All webhook requests are POST requests. To add a webhook to nelson, start it with ```--webhooks``` option:

```
nelson --webhooks "http://webhook.one/ http://webhook.two/"
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

Make sure you have node v.8.9.4 or higher installed on your machine.

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

### I upgraded nelson, but it's still the old version!

Please refer to [upgrading](#upgrading) for a possible reason.

## Contributing

### Donations

**Donations always welcome**:

```
YHZIJOENEFSDMZGZA9WOGFTRXOFPVFFCDEYEFHPUGKEUAOTTMVLPSSNZNHRJD99WAVESLFPSGLMTUEIBDZRKBKXWZD
```

### Running your own entry node

As the network grows, we will need more entry nodes. These "master" nodes serve as gates to the
network for new nodes. They accept slightly more connections and do not actively connect to others.
The entry nodes only share info about the nodes that have contacted them sometime in the past.

You can run a master node by adding these options to Nelson:

```
--isMaster --epochInterval 180 --incomingMax 9
```
The first value tells Nelson to run in "master" mode. The second decreases the epoch time so that
the connected nodes are rotated faster, giving space to new nodes. The third increases the amount
of accepted connections (since master nodes do not have active connections, the outgoingMax for masters does not do anything).

You can contact the maintainer of this repo (http://www.twitter.com/RomanSemko) to get your node
included here. An initiative for donations to entry nodes is under way.

## Authors

* **Roman Semko** - *SemkoDev* - (https://github.com/romansemko)
* **Vitaly Semko** - *SemkoDev* - (https://github.com/witwit)

## License

This project is licensed under the ICS License - see the [LICENSE.md](LICENSE.md) file for details

