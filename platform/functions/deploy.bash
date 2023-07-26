#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

action="${1:-deploy}"
rundir="${2:-$SCRIPT_DIR/*/}"

echo "action is $action"
echo "dir is $rundir"

for dir in $rundir;
    do (func $action --path $dir && kubectl apply -f $SCRIPT_DIR/../resources/observability/config-tracing.knative.configmap.yaml);
done;
