import { Context, StructuredReturn } from '@hypsibius/faas-js-runtime';
import { App } from '@slack/bolt';
import FaaSJSReceiver from './faas-js.receiver';
import { getPublishFunction, SlackLogger } from '@hypsibius/knative-faas-utils';

let receiver: FaaSJSReceiver;
let app: App;

const publish = getPublishFunction();

function initialize(context: Context): FaaSJSReceiver {
  if (!receiver && !app) {
    const signingSecret: string | undefined = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
      throw Error(`Environment variable SLACK_SIGNING_SECRET doesn't exist`);
    }
    const logger = new SlackLogger(context.log);
    receiver = new FaaSJSReceiver({
      signingSecret: signingSecret,
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
      await publish(payload.type, payload);
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
