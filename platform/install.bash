#! /usr/bin/bash
helm install ngrok-ingress-controller ngrok/kubernetes-ingress-controller \
  --namespace ngrok-ingress-controller \
  --create-namespace \
  --set credentials.apiKey=$NGROK_API_KEY \
  --set credentials.authtoken=$NGROK_AUTHTOKEN \
&& helm install community-operator mongodb/community-operator --namespace mongodb --create-namespace \
&& kubectl apply -Rf resources/0-namespaces.yaml \
&& kubectl apply -Rf resources/0-operators/ \
&& kubectl apply -Rf resources/1-global/ \
&& sleep 5 \
&& kubectl apply -Rf resources/2-observability/ \
&& kubectl apply -Rf resources/3-knative/ \
&& sleep 3 \
&& kubectl apply -Rf resources/4-rabbitmq/ \
&& kubectl apply -Rf resources/5-mongodb/ \
&& sleep 10
&& kubectl apply -Rf resources/6-eventing/ \
&& kubectl apply -Rf resources/7-slack/ \
&& sleep 5
&& ./functions/deploy.bash "deploy --build"
