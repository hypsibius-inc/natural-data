#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

action="${1:-deploy}"
rundir=$(realpath "${2:-$SCRIPT_DIR/*/}")/

echo "action is $action"
echo "dir is $rundir"

docker rmi -f $(docker images "localhost:5000/*" -a --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>")
docker rmi -f $(docker images "localhost:5000/*" -aq)
docker system prune -f

for dir in $rundir; do 
  func $action --path $dir && kubectl apply -f $SCRIPT_DIR/../resources/2-observability/config-tracing.knative.configmap.yaml &
done
wait
