import { SlackLogger, getSource } from '@hypsibius/knative-faas-utils';
import { EventsToTypes } from '@hypsibius/message-types';
import { WebClient } from '@slack/web-api';
import { CloudEvent } from 'cloudevents';
import { Logger, Context as FaaSContext } from 'faas-js-runtime';

let logger: SlackLogger;

function initialize(log: Logger): SlackLogger {
  if (!logger) {
    logger = new SlackLogger(log);
  }
  return logger;
}

/**
 * Your CloudEvents function, invoked with each request. This
 * is an example function which logs the incoming event and echoes
 * the received event data to the caller.
 *
 * It can be invoked with 'func invoke'.
 * It can be tested with 'npm test'.
 *
 * @param {Context} context a context object.
 * @param {object} context.body the request body if any
 * @param {object} context.query the query string deserialzed as an object, if any
 * @param {object} context.log logging object with methods for 'info', 'warn', 'error', etc.
 * @param {object} context.headers the HTTP request headers
 * @param {string} context.method the HTTP request method
 * @param {string} context.httpVersion the HTTP protocol version
 * See: https://github.com/knative/func/blob/main/docs/guides/nodejs.md#the-context-object
 * @param {CloudEvent} cloudevent the CloudEvent
 */
const handle = async (
  context: FaaSContext,
  cloudevent?: CloudEvent<EventsToTypes['slack_send_message']>
): Promise<CloudEvent<Error | EventsToTypes['slack_send_message_response']>> => {
  const source = getSource();
  if (!cloudevent || !cloudevent.data) {
    const response: CloudEvent<EventsToTypes['error']> = new CloudEvent({
      type: 'error',
      data: new Error('No event received'),
      source: source
    });
    return response;
  }
  context.log.info(`DATA: ${JSON.stringify(cloudevent.data)}`);
  try {
    const client = new WebClient(cloudevent.data.webClientParams.token, {
      ...cloudevent.data.webClientParams.options,
      logger: initialize(context.log)
    });
    return new CloudEvent<EventsToTypes['slack_send_message_response']>({
      source: source,
      data: {
        res: await client.chat.postMessage(cloudevent.data.args),
        webClientParams: cloudevent.data.webClientParams
      },
      type: 'slack_send_message_response'
    });
  } catch (e) {
    context.log.error(JSON.stringify(e));
    return new CloudEvent({
      type: 'error',
      source: source,
      data: new Error(JSON.stringify(e))
    });
  }
};

export { handle };
