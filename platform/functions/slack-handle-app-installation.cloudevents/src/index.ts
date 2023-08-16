import {
  DefinedCloudEvent,
  SlackLogger,
  assertNotEmptyCloudEventWithErrorLogging,
  asyncTryCatch,
  getErrorCloudEvent,
  getPublishFunction
} from '@hypsibius/knative-faas-utils';
import { ErrorEvent, HypsibiusEvent, SlackAppInstallationSuccess } from '@hypsibius/message-types';
import { WebClient } from '@slack/web-api';
import { Context, Logger, StructuredReturn } from 'faas-js-runtime';

const publish = getPublishFunction<HypsibiusEvent>();

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
    cloudevent: DefinedCloudEvent<SlackAppInstallationSuccess>
  ): Promise<DefinedCloudEvent<ErrorEvent> | StructuredReturn> => {
    context.log.info(`Received Event: ${JSON.stringify(cloudevent.data)}`);
    const ret = await asyncTryCatch<DefinedCloudEvent<ErrorEvent> | undefined>(async () => {
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
      return await asyncTryCatch<DefinedCloudEvent<ErrorEvent> | undefined>(async () => {
        const profile = await api.users.info({
          user: cloudevent.data.payload.user.id
        });
        if (profile.ok && profile.user && profile.user.profile && profile.user.profile.email) {
          await publish({
            data: {
              type: 'hypsibius.slack.user_installed_app',
              installation: cloudevent.data.payload,
              installationId: cloudevent.data.id,
              user: profile.user
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
