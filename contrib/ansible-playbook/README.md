# IOTA Nelson (IRI) Fullnode Ansible Playbook

Run:
```sh
ansible-playbook -i inventory -v site.yml
```

Specifc roles and or tasks can be run individually or skipped using `--tags=tag_name_a,tag_name_b` or `--skip-tags=tag_name`.
