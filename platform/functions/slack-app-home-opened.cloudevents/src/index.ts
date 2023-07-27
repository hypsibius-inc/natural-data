import { DefinedCloudEvent, assertNotEmptyCloudEventWithErrorLogging, getPublishFunction } from '@hypsibius/knative-faas-utils';
import { EventsToTypes, HypsibiusSlackEvent } from '@hypsibius/message-types';
import { Context, StructuredReturn } from 'faas-js-runtime';

const publish = getPublishFunction<EventsToTypes>();

const handle = assertNotEmptyCloudEventWithErrorLogging(
  async (
    context: Context,
    cloudevent: DefinedCloudEvent<HypsibiusSlackEvent<'app_home_opened'>>
  ): Promise<StructuredReturn> => {
    context.log.info(`Received Event: ${JSON.stringify(cloudevent.data)}`);
    await publish({
      type: 'slack_send_message',
      data: {
        webClientParams: {
          token: cloudevent.data.context.botToken!
        },
        args: {
          channel: cloudevent.data.payload.channel,
          text: `Hi <@${cloudevent.data.payload.user}>`
        }
      }
    });
    return {
      statusCode: 200
    };
  }
);

export { handle };
