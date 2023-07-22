## Triggers
Each folder represents a namespace within which the triggers should be created.
Triggers can only be tied to brokers of the same namespace.
Triggers can only invoke services in the same namespace.

This means we need a broker for each namespace in which we have functions.
In order to distribute all events to all namespaces, we have the `parallel` resource.
The parallel trigger is what guarantees all events from the default broker in the eventing namespace will be sent to all other brokers, and onwards to their own registered triggers (per function).
Whenever adding a new trigger to a new namespace, the broker will automatically be created (thanks to the sugar controller).
In order for that broker to receive all events sent, we need to add that broker to the list of *branches* in the [parallel](./parallel.yaml).
