import { SlackLogger, getPublishFunction } from '@hypsibius/knative-faas-utils';
import { getEnvVarOrThrow } from '@hypsibius/knative-faas-utils/utils';
import { HypsibiusEvent } from '@hypsibius/message-types';
import { App } from '@slack/bolt';
import { Context, StructuredReturn } from 'faas-js-runtime';
import FaaSJSReceiver from './faas-js.receiver';
import { getInstallationStore } from './installation-store';
import { handleActions } from './slack.app/actions';
import { handleEvents } from './slack.app/events';
import { handleViews } from './slack.app/views';

const signingSecret = getEnvVarOrThrow('SLACK_SIGNING_SECRET');
const clientId = getEnvVarOrThrow('SLACK_CLIENT_ID');
const clientSecret = getEnvVarOrThrow('SLACK_CLIENT_SECRET');
const appToken = getEnvVarOrThrow('SLACK_APP_TOKEN');
const scopes = getEnvVarOrThrow('SLACK_APP_SCOPES');

const installationServiceURL =
  process.env.INSTALLATION_SVC_URL ||
  'http://slack-mongo-installation-manager.mongodb.svc.cluster.local';

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
    handleEvents(app, logger, publish);
    handleActions(app, logger, publish);
    handleViews(app, logger);
  }
  return receiver;
}

const handle = async (
  context: Context,
  body: Record<string, unknown> | string
): Promise<StructuredReturn> => {
  return await initialize(context).handle(context, body);
};

export { handle };
