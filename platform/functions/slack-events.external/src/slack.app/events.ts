import { SlackLogger } from '@hypsibius/knative-faas-utils';
import { PublishFunction } from '@hypsibius/knative-faas-utils/build/publish';
import { HypsibiusEvent } from '@hypsibius/message-types';
import { App } from '@slack/bolt';
import { buildHomeView } from './home-view';

export const handleEvents = (app: App, logger: SlackLogger, publish: PublishFunction<HypsibiusEvent>): void => {
  app.event(/.*/gm, async ({ event, context }) => {
    logger.warn(
      `Published ${JSON.stringify(
        await publish({
          data: {
            type: `slack.event.${event.type}`,
            payload: event,
            context
          }
        })
      )}`
    );
  });
  app.event('app_home_opened', async ({ event, context, client }) => {
    if (!context.teamId) {
      throw Error(`Context is missing teamId`);
    }
    const view = await buildHomeView(context.teamId, event.user);
    const resp = await client.views.publish({
      view: view,
      user_id: event.user
    });
    if (!resp.ok) {
      throw Error(JSON.stringify(resp));
    }
    client.chat.postMessage({
      channel: event.channel,
      text: `Hi <@${event.user}>`
    });
  });
};
