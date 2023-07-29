# The Hypsibius Platform
## Installing on new K8s
* Install Ngrok ingress controller if needed (Domain might be supplied by cloud provider)
  * [Get auth keys](https://ngrok.com/docs/using-ngrok-with/k8s/#step-2-setup-your-kubernetes-cluster-and-install-the-ngrok-ingress-controller)
  * [Follow steps 2-4 inclusive](https://ngrok.com/docs/using-ngrok-with/k8s/#step-2-setup-your-kubernetes-cluster-and-install-the-ngrok-ingress-controller)
  * Steps 5+ are the yaml located [here](./resources/slack/serving/slack-events.ingress.yaml)
* [Install the MongoDB community operator](https://github.com/mongodb/mongodb-kubernetes-operator/blob/master/docs/install-upgrade.md#install-in-a-different-namespace-using-helm)
  * In the `mongodb` namespace
* Apply all yamls
  ```bash
  kubectl apply -Rf resources/
  ```
### Upgrading operators
Download the newer resources and replace in [operators](./resources/0-operators/)
* [Upgrade Cert-Manager](https://cert-manager.io/docs/installation/helm/#steps)
  * Follow steps 1-4
* [Upgrade Knative Operator](https://knative.dev/docs/install/operator/knative-with-operators/#install-the-knative-operator)
* [Upgrade RabbitMQ operator](https://github.com/rabbitmq/cluster-operator#quickstart)
* [Upgrade RabbitMQ Messaging Topology operator](https://github.com/rabbitmq/messaging-topology-operator/#quickstart)
* [Upgrade RabbitMQ Knative Broker](https://knative.dev/docs/eventing/brokers/broker-types/rabbitmq-broker/#install-the-rabbitmq-controller)
* [Upgrade the OpenTelemtry operator](https://github.com/open-telemetry/opentelemetry-operator#getting-started)
* [Upgrade the Jaeger operator](https://www.jaegertracing.io/docs/latest/operator/#installing-the-operator-on-kubernetes)

## Deploying functions
Execute this [helper script](./functions/deploy.bash) to deploy all functions.

**WARNING: this does not guarantee deployment order by dependence.**
## Adding functions
Use the func CLI (knative plugin) to create new functions within the functions directory.
When deploying, you might get an error. Run `npm upgrade` to resolve.
When choosing a registry, you can deploy `localhost:5000` and specify that in the `func.yaml` that's generated for each function.

Add the npm script to your `package.json`
```json
{
  "scripts": {
    "install-utils": "rm -rf ./utils && mkdir -p ./utils && tar -cO ../../utils | tar -x && npm i --save ./utils/*"
  }
}
```
Add `/utils` to the generated `.gitignore`.
Whenever updating any util in utils, be sure to run `npm run install utils` on the functions relevant to the change.

Use the [@hypsibius/knative-faas-utils](./utils/knative-faas-utils/) package to publish messages between functions.
```typescript
import { getPublishFunction } from '@hypsibius/knative-faas-utils';

const publish = getPublishFunction();
...

const eventData: EventDataSchema;
publish<EventDataSchema>('event_type', eventData);
```

## Routing
Send events between functions without specifying the connection information in code.
When adding yaml files, be sure to `kubectl apply -f <path-to-file>` them.
### For publishing
Add a Knative-Eventing "SinkBinding" in `resources/<namespace>/sinks/<service-name>.sink-binding.yaml` with the configured fields for targeting the correct service of your function.
### For registering
Add a Knative-Eventing "Trigger" in `resources/<namespace>/triggers/<event-type>.trigger.yaml` with the configured fields for targeting the correct event name, and add all the services that should register to this event under `scopes`.
### Notes
* Each service can send out multiple types of events and need only register once for publishing through sink-binding.
* Each service can receive multiple types of events, and needs to register to each of them separately through triggers.

## Common issues
* When hosting slack-events through NGROK, an error might come up `ERR_NGROK_3207`. To solve this, you must delete and apply the [ngrok ingress yaml](resources/slack/serving/slack-events.ingress.yaml). This might take a few seconds to load.
* When any error occurs in Node functions regarding import of packages, it's likely an issue with the builder. Delete the function, delete the images, prune the system and the builder cache.
```bash
docker system prune -f
docker builder prune -f
```
