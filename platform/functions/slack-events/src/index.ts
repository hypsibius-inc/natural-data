import { Context, StructuredReturn } from '@hypsibius/faas-js-runtime';
import { App } from '@slack/bolt';
import FaaSJSReceiver from './faas-js.receiver';
import { SlackLogger } from './slack.logger';
import { DaprClient } from '@dapr/dapr';
import { CloudEvent, Emitter, emitterFor, httpTransport } from 'cloudevents';

let receiver: FaaSJSReceiver;
let app: App;

const K_SINK: string = process.env.K_SINK!;
const SOURCE: string = process.env.K_REVISION!;
if (!K_SINK) {
  throw Error('No K_SINK env');
}
if (!SOURCE) {
  throw Error(JSON.stringify(Object.keys(process.env)));
}
Emitter.on("cloudevent", async (ce) => {
  console.log(`
  Emitting ${JSON.stringify(ce)}
  to ${K_SINK}
  `);
  return await emitterFor(httpTransport(K_SINK))(ce);
})

const emit = async <T>(event: string, data: T): Promise<CloudEvent<T>> => {
  return await new CloudEvent<T>({type: event, source: SOURCE, data: data}).emit(true);
}

const dapr = new DaprClient();

const publish = async (topic: string, data: object | string) => {
  const ret = await dapr.pubsub.publish('default-pubsub', topic, data);
  if (ret.error) {
    throw ret.error;
  }
};

function initialize(context: Context): FaaSJSReceiver {
  if (!receiver && !app) {
    const logger = new SlackLogger(context.log);
    receiver = new FaaSJSReceiver({
      signingSecret: process.env.SLACK_SIGNING_SECRET!,
      logger: logger
    });
    app = new App({
      processBeforeResponse: true,
      token: process.env.SLACK_BOT_TOKEN,
      appToken: process.env.SLACK_APP_TOKEN,
      receiver: receiver,
      logger: logger
    });

    app.event('app_home_opened', async ({ logger, payload }) => {
      logger.warn(JSON.stringify(payload));
      await publish('slack.app-home-opened', payload);
      await emit(payload.type, payload);
    });
  }
  return receiver;
}

/**
 * Your HTTP handling function, invoked with each request. This is an example
 * function that logs the incoming request and echoes its input to the caller.
 *
 * It can be invoked with `func invoke`
 * It can be tested with `npm test`
 *
 * It can be invoked with `func invoke`
 * It can be tested with `npm test`
 *
 * @param {Context} context a context object.
 * @param {object} context.body the request body if any
 * @param {object} context.query the query string deserialized as an object, if any
 * @param {object} context.log logging object with methods for 'info', 'warn', 'error', etc.
 * @param {object} context.headers the HTTP request headers
 * @param {string} context.method the HTTP request method
 * @param {string} context.httpVersion the HTTP protocol version
 * See: https://github.com/knative/func/blob/main/docs/guides/nodejs.md#the-context-object
 */
const handle = async (context: Context, body: Record<string, any> | string): Promise<StructuredReturn> => {
  const receiver = initialize(context);
  const handler = await receiver.start();
  return await handler(context, body);
};

export { handle };
