#!/bin/bash

# dd if=/dev/urandom of=bigfile bs=1M count=4096
dd if=/dev/urandom of=bigfile bs=1M count=1024
