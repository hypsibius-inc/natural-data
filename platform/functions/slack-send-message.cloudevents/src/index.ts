import {
  DefinedCloudEvent,
  SlackLogger,
  assertNotEmptyCloudEventWithErrorLogging,
  asyncTryCatch,
  getSource
} from '@hypsibius/knative-faas-utils';
import { EventsToTypes } from '@hypsibius/message-types';
import { WebClient } from '@slack/web-api';
import { CloudEvent } from 'cloudevents';
import { Context, Logger } from 'faas-js-runtime';

let logger: SlackLogger;

function initialize(log: Logger): SlackLogger {
  if (!logger) {
    logger = new SlackLogger(log);
  }
  return logger;
}

const handle = assertNotEmptyCloudEventWithErrorLogging(
  async (
    context: Context,
    cloudevent: DefinedCloudEvent<EventsToTypes['slack_send_message']>
  ): Promise<DefinedCloudEvent<Error> | CloudEvent<EventsToTypes['slack_send_message_response']>> => {
    return await asyncTryCatch(async () => {
      const client = new WebClient(cloudevent.data.webClientParams.token, {
        ...cloudevent.data.webClientParams.options,
        logger: initialize(context.log)
      });
      return new CloudEvent<EventsToTypes['slack_send_message_response']>({
        source: getSource(),
        data: {
          res: await client.chat.postMessage(cloudevent.data.args),
          webClientParams: cloudevent.data.webClientParams
        },
        type: 'slack_send_message_response'
      });
    });
  }
);

export { handle };
