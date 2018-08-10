# IOTA Nelson (IRI) Fullnode Ansible Playbook

This playbook will install IRI and Nelson As Docker containers.


## Requirements


### Operating System
This playbook has been tested on:

* Ubuntu 16.04 and 17.04
* CentOS 7.4

### Software Dependencies

**Note** Docker CE will be installed by the playbook, it is not strictly required to install it before running the playbook.

* Docker CE

For Ubuntu: https://docs.docker.com/engine/installation/linux/docker-ce/ubuntu/

For CentOS: https://docs.docker.com/engine/installation/linux/docker-ce/centos/ 

* Ansible >= 2.4

To install Ansible:

**Ubuntu**:

```sh
apt-get upgrade -y && apt-get clean && apt-get update -y && apt-get install software-properties-common -y && apt-add-repository ppa:ansible/ansible -y && apt-get update -y && apt-get install ansible -y
```

**CentOS**:

```sh
yum install ansible -y
```

#### Consideration
Consider to run the playbook within a screen session. Should the SSH connection drop, the playbook's session will remain active.

Ensure `screen` is installed:
**Ubuntu**:
```sh
apt-get install screen -y
```

**CentOS**:
```sh
yum install screen -y
```

Then use `screen -S nelson` to create a session and run the next commands within.

To detach from the session, press `CTRL-A` and `d`.

To reattach to a session `screen -r nelson` or `screen -D -r nelson` if the screen is still attached.

Use `exit` or `CTRL-D` within the session to end the session.

## Configuration

If you want to configure values before running the playbook you will find the variables in the files under:
```sh
group_vars/all/*.yml
```

## Installation

Run:
```sh
ansible-playbook -i inventory -v site.yml
```

Specifc roles and or tasks can be run individually or skipped using `--tags=tag_name_a,tag_name_b` or `--skip-tags=tag_name`.


## Controls

To start, stop or view status of either `nelson` or `iri` run:

```sh
systemctl status iri
```

Replace the service name or command as required.

## Logs

To view the logs of either `nelson` or `iri` run:

```sh
journalctl -u iri
```

Use `shift-g` to scroll to the bottom.

Alterntively, to avoid using the pager:
```sh
journalctl -u nelson --no-pager -n50
```

This command will display the last 50 lines of the log.

You can use `-f` to follow the tail of the log.

## File Locations

* Nelson's configuration is at `/etc/nelson/config.ini`
* IRI config is at `/etc/iri/iri.ini`
* Nelson's data directory is at `/var/lib/nelson/`
* IRI's database is at `/var/lib/iri/`

