import {
  DefinedCloudEvent,
  SlackLogger,
  assertNotEmptyCloudEvent,
  asyncTryCatch,
  getErrorCloudEvent,
  getPublishFunction
} from '@hypsibius/knative-faas-utils';
import { EventsToTypes, SlackAppInstallationSuccess } from '@hypsibius/message-types';
import { WebClient } from '@slack/web-api';
import { Context, Logger, StructuredReturn } from 'faas-js-runtime';

const publish = getPublishFunction<EventsToTypes>();

let logger: SlackLogger;

function initialize(log: Logger): SlackLogger {
  if (!logger) {
    logger = new SlackLogger(log);
  }
  return logger;
}

const handle = assertNotEmptyCloudEvent(
  async (
    context: Context,
    cloudevent: DefinedCloudEvent<SlackAppInstallationSuccess>
  ): Promise<DefinedCloudEvent<EventsToTypes['error']> | StructuredReturn> => {
    context.log.info(`Received Event: ${JSON.stringify(cloudevent.data)}`);
    const ret = await asyncTryCatch<DefinedCloudEvent<Error> | undefined>(async () => {
      const api = new WebClient(cloudevent.data.payload.bot!.token, {
        logger: initialize(context.log)
      });
      for (const conv of (await api.conversations.list({})).channels || []) {
        if (!conv.is_im && !conv.is_private && !conv.is_member) {
          const resp = await api.conversations.join({
            channel: conv.id!
          });
          if (!resp.ok) {
            context.log.error(`Failed to join channel ${conv.id} with message: ${resp.error}`);
          }
        }
      }
      return await asyncTryCatch<DefinedCloudEvent<Error> | undefined>(async () => {
        const profile = await api.users.profile.get({
          user: cloudevent.data.payload.user.id
        });
        if (profile.ok && profile.profile) {
          await publish({
            type: 'slack_user_installed_app',
            data: {
              installation: cloudevent.data.payload,
              installationId: cloudevent.data.id,
              profile: profile.profile
            }
          });
          return;
        } else {
          return getErrorCloudEvent(`Profile of ${cloudevent.data.payload.user.id} returned empty`);
        }
      });
    });
    if (ret === undefined) {
      return {
        statusCode: 200
      };
    } else {
      return ret!;
    }
  }
);

export { handle };
