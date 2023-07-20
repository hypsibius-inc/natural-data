#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

action="${1:-deploy}"

for dir in $SCRIPT_DIR/*/;
    do (func $action --path $dir);
done;
