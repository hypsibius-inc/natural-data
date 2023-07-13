# The Hypsibius Platform
## Adding functions
Use the func CLI (knative plugin) to create new functions within the functions directory.
When deploying, you might get an error. Run `npm upgrade` to resolve.
When choosing a registry, you can deploy `localhost:5000` and specify that in the `func.yaml` that's generated for each function.

Use the `@hypsibius/knative-faas-utils` package to publish messages between functions.
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
* When hosting slack-events through NGROK, an error might come up `ERR_NGROK_3207`. To solve this, you must delete and apply the `resources/slack/serving/slack-events.ingress.yaml`. This might take a few seconds to load.
* When any error occurs in Node functions regarding import of packages, it's likely an issue with the builder. Delete the function, delete the images, prune the system and the builder cache.
```bash
docker system prune -f
docker builder prune -f
```
