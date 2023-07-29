import { SlackLogger, getPublishFunction } from '@hypsibius/knative-faas-utils';
import { HypsibiusEvent, KnownActionFromType } from '@hypsibius/message-types';
import { App } from '@slack/bolt';
import { Context, StructuredReturn } from 'faas-js-runtime';
import FaaSJSReceiver from './faas-js.receiver';
import { getInstallationStore } from './installation-store';

const signingSecret: string = process.env.SLACK_SIGNING_SECRET!;
if (!signingSecret) {
  throw Error(`Environment variable SLACK_SIGNING_SECRET doesn't exist`);
}
const clientId: string = process.env.SLACK_CLIENT_ID!;
if (!clientId) {
  throw Error(`Environment variable SLACK_CLIENT_ID doesn't exist`);
}
const clientSecret: string = process.env.SLACK_CLIENT_SECRET!;
if (!clientSecret) {
  throw Error(`Environment variable SLACK_CLIENT_SECRET doesn't exist`);
}
const appToken: string = process.env.SLACK_APP_TOKEN!;
if (!appToken) {
  throw Error(`Environment variable SLACK_APP_TOKEN doesn't exist`);
}
const scopes: string = process.env.SLACK_APP_SCOPES!;
if (!scopes) {
  throw Error(`Environment variable SLACK_APP_SCOPES doesn't exist`);
}

const installationServiceURL = 'http://slack-mongo-installation-manager.mongodb.svc.cluster.local';

const publish = getPublishFunction<HypsibiusEvent>();
let receiver: FaaSJSReceiver;
let app: App;

function initialize(context: Context): FaaSJSReceiver {
  if (!receiver && !app) {
    const logger = new SlackLogger(context.log);
    receiver = new FaaSJSReceiver({
      signingSecret,
      logger,
      publish,
      installerOptions: {
        clientId,
        clientSecret,
        directInstall: true,
        stateSecret: 'hypsibius-is-a-tardigrade',
        installUrlOptions: {
          scopes: scopes
        },
        installationStore: getInstallationStore(installationServiceURL, logger)
      },
      scopes: scopes
    });
    app = new App({
      processBeforeResponse: true,
      appToken: appToken,
      receiver: receiver,
      logger: logger
    });
    app.event(/.*/, async ({ payload, context }) => {
      logger.warn(
        `Published ${JSON.stringify(
          await publish({
            data: {
              type: `slack.event.${payload.type}`,
              payload: payload,
              context
            }
          })
        )}`
      );
    });
    app.action(/.*/, async ({ body, payload, context, ack }) => {
      await ack();
      switch (body.type) {
        case 'block_actions':
          const p = payload as KnownActionFromType<typeof payload.type>;
          const { actions, ...slimBody } = body;
          logger.warn(
            `Published ${JSON.stringify(
              await publish({
                data: {
                  type: `slack.blockAction.${p.type}`,
                  payload: p,
                  context,
                  body: slimBody
                },
                extra: {
                  block_id: p.block_id,
                  action_id: p.action_id
                }
              })
            )}`
          );
          break;
        case 'dialog_submission':
          // Unsupported yet
          break;
        case 'interactive_message':
          // Slack Legacy
          break;
        case 'workflow_step_edit':
          // Unsupported yet
          break;
      }
    });
  }
  return receiver;
}

const handle = async (context: Context, body: Record<string, any> | string): Promise<StructuredReturn> => {
  const handler = await initialize(context).start();
  return await handler(context, body);
};

export { handle };
