# CarrIOTA Nelson

Nelson is a tool meant to be used with IOTA's IRI Node.
It automatically manages neighbors of your full node, negotiating connections,
finding new neighbors and protecting against bad actors.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine.

### Prerequisites

It is expected that you have already installed Java, downloaded the IRI jar file
and know how to start it. The local IRI instance must have api enabled and allowing to add/remove neighbors.

Nelson is running on Node.js You will have to install node and npm (node package manager) on your system.
Alternatively to npm you can (and should) use yarn package manager.

### Installing

Globally install nelson

```
npm install -g nelson.cli
```

And run it

```
nelson --gui --neighbors "mainnet.deviota.com/16600 mainnet2.deviota.com/16600 mainnet3.deviota.com/16600"
```

The  ```--neighbors``` option is used to provide an entry set of trusted nelson peers for new nelson instances.
As your nelson stays online and gets to know its neighbors, it will rely less and less on the initial entry
points.

The  ```--gui``` option is used to provide a simple GUI interface in the console.

Below is the list of all possible options.

## Docker

Provided you have docker installed, nelson can be started as follows:

```
docker run <docker opts> romansemko/nelson <nelson command line opts>
```

Hence, running IRI with Nelson can be done with two simple commands:
```
docker run -d --net host -p 14265:14265 --name iri iotaledger/iri
docker run -d --net host -p 18600:18600 --name nelson romansemko/nelson -r localhost -i 14265 -u 14777 -t 15777 --neighbors "mainnet.deviota.com/16600 mainnet2.deviota.com/16600 mainnet3.deviota.com/16600"
```

The options passed to nelson's docker (```-r localhost -i 14265 -u 14777 -t 15777 --neighbors ...```) set IRI's
hostname and ports (api, TCP, UDP) and the initial neighbors. Please refer below for more info on options.

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
node ./dist/nelson.js --gui --neighbors "mainnet.deviota.com/16600 mainnet2.deviota.com/16600 mainnet3.deviota.com/16600"
```

## Configuration

You are free to either use command line options or an ```.ini``` file to configure Nelson. If you use a config
file, it has precedence and all command line options are ignored.

### config.ini

To use a configuration file, run Nelson with ```--config``` option:

```
nelson --config ./config.ini
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
TCPPort = 15777
UDPPort = 14777
dataPath = data/neighbors.db
isMaster = false
silent = false
gui = false
; add as many initial nelson neighbors, as you like
neighbors[] = mainnet.deviota.com/16600
neighbors[] = mainnet2.deviota.com/16600
neighbors[] = mainnet3.deviota.com/16600
```

### Command line options

Command line options are named the same as INI options.
Some have additional short versions.

### Options description

| Option                 |      Description                        | Default |
|------------------------|-----------------------------------------|---------|
| --neighbors, -n |  space-separated list of nelson neighbors ||
| --apiPort, -a | Nelson API port to request current node status data|18600|
| --apiHostname, -o | Nelson API hostname to request current node status data. Default value will only listen to local connections|127.0.0.1|
| --port, -p | TCP port, on which to start your nelson instance|16600|
| --IRIHostname, -r| IRI API hostname of the running IRI node instance|localhost|
| --IRIPort, -i| IRI API port of the running IRI node instance|14265|
| --TCPPort, -t| IRI TCP Port|15777|
| --UDPPort, -u| IRI UDP Port|14777|
| --dataPath, -d| path to the file, that will be used as neighbor storage| data/neighbors.db|
| --silent, -s|Run the node without any output||
| --gui, -g|Run the node in console-gui mode||
| --cycleInterval| Interval between Nelson cycles|60|
| --epochInterval| Interval between Nelson epochs|300|
| --isMaster| Whether you are intending to run a master node||

## Epochs and Cycles

Nelson grows. And with each new age (epoch), he treats his neighbors differently. A neighbor that he didn't like in the
past, might become his best friend in the new epoch. The epoch option defines the interval in seconds between each epoch
change. Do not change it, unless you know, what you are doing.

Nelson checks upon its neighbors from time to time to make sure they are okay. Sometimes the neighbors die without saying
a word or maybe move somewhere else. Nelson wants to know, with whom he should keep in contact. Each cycle Nelson pings
the neighbors, to make sure they are okay. You can control the cycle interval with the ```cycleInterval``` option.

## Initial nodes

The neighbors you provide in the beginning are treated as trusted neighbors. This means that Nelson will be more inclined
to accept contact requests from these neighbors and also to recommend them to other neighbors. They are also used as
initial contact for a young Nelson. They provide him with other neighbors' addresses.

### Help! Nelson isn't connecting to neighbors!

Depending on Nelson's age/epoch he might or might not like a certain neighbor. That's okay. Just wait for the neighbor
to mature and he might accept you into his circle.

This is more acute for new nodes without any neighbors at all. 
You might need to wait for quite some time to be accepted into the network.

The same happens to your own Nelson instance. It might deny contact from new neighbors or those he doesn't know well.
The less trusted and less known a neighbor is, the less likely your Nelson will contact him. This is a security measure
to slowly structure the network and give more weight to old, trusted neighborhood. You can read more about it in the
Nelson's release article: https://medium.com/deviota/carriota-nelson-in-a-nutshell-1ee5317d8f19

## Monitor
There is a simple Nelson http server/monitor available at: https://github.com/SemkoDev/nelson.mon
This is work in progress, so please bear with the simplicity.

## Authors

* **Roman Semko** - *SemkoDev* - (https://github.com/romansemko)
* **Vitaly Semko** - *SemkoDev* - (https://github.com/witwit)

## License

This project is licensed under the ICS License - see the [LICENSE.md](LICENSE.md) file for details

## TODO

There are some open TODO's in the source code. Most urging are:

- node tests: tested using simulation tools (will be published separately), but some Jest tests would be nice.
- structural/organizational work: linting, editor config, contributions specs
- etc.?

Any help welcome!
