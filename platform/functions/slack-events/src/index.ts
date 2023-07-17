import { Context, StructuredReturn } from 'faas-js-runtime';
import { SlackLogger, getPublishFunction } from '@hypsibius/knative-faas-utils';
import { HypsibiusSlackEvent } from '@hypsibius/message-types';
import { App } from '@slack/bolt';
import FaaSJSReceiver from './faas-js.receiver';
import { getInstallationStore } from './installation-store';

let receiver: FaaSJSReceiver;
let app: App;

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

const publish = getPublishFunction<HypsibiusSlackEvent>();

function initialize(context: Context): FaaSJSReceiver {
  if (!receiver && !app) {
    const logger = new SlackLogger(context.log);
    receiver = new FaaSJSReceiver({
      signingSecret: signingSecret,
      logger: logger,
      installerOptions: {
        clientId,
        clientSecret,
        directInstall: true,
        stateSecret: 'hypsibius-is-a-tardigrade',
        installUrlOptions: {
          scopes: scopes,
        },
        installationStore: getInstallationStore(installationServiceURL)
      },
      scopes: scopes
    });
    app = new App({
      processBeforeResponse: true,
      appToken: appToken,
      receiver: receiver,
      logger: logger
    });

    app.event('app_home_opened', async ({ logger, payload, context }) => {
      logger.warn(JSON.stringify(payload));
      await publish(payload.type, {
        payload,
        context
      });
    });
    app.action('some_action');
  }
  return receiver;
}

const handle = async (context: Context, body: Record<string, any> | string): Promise<StructuredReturn> => {
  const handler = await initialize(context).start();
  return await handler(context, body);
};

export { handle };
