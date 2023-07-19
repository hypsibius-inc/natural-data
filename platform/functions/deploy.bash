#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

for dir in $SCRIPT_DIR/*/;
    do (func deploy --path $dir);
done;
