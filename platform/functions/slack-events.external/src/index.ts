import { SlackLogger, getPublishFunction } from '@hypsibius/knative-faas-utils';
import { HypsibiusEvent, KnownActionFromType } from '@hypsibius/message-types';
import { OnceIn, User } from '@hypsibius/message-types/mongo';
import { formatLabelAlert } from '@hypsibius/message-types/utils';
import { App, Context as SlackContext } from '@slack/bolt';
import { Context, StructuredReturn } from 'faas-js-runtime';
import { getUser } from './apis/user-manager';
import FaaSJSReceiver from './faas-js.receiver';
import { getInstallationStore } from './installation-store';
import { getDeleteModal } from './interactions/delete.modal';
import { getAlertEditModal } from './interactions/edit-alert.modal';
import { getLabelEditModal } from './interactions/edit-label.modal';

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

const installationServiceURL =
  process.env.INSTALLATION_SVC_URL || 'http://slack-mongo-installation-manager.mongodb.svc.cluster.local';

const publish = getPublishFunction<HypsibiusEvent>();
let receiver: FaaSJSReceiver;
let app: App;

const getUserFromContext = async (context: SlackContext): Promise<User> => {
  return await getUser({
    userId: context.userId!,
    teamOrgId: context.teamId!,
    projection: {
      labels: true
    }
  });
};

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
    // app.view(/.*/gm, async ({ ack, context, view }) => {
    //   await ack({});
    // });
    app.action(/.*/gm, async ({ body, action, context, ack, client }) => {
      await ack();
      switch (body.type) {
        case 'block_actions':
          const p = action as KnownActionFromType<typeof action.type>;
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
          if (p.action_id === 'labels.delete') {
            const deleteModalViewOpen = await client.views.open({
              trigger_id: body.trigger_id,
              view: getDeleteModal('labels', 'delete.labels', (await getUserFromContext(context)).labels || [])
            });
            if (!deleteModalViewOpen.ok) {
              throw Error(`Couldn't open DeleteLabels view because: ${deleteModalViewOpen.error}`);
            }
          }
          const isDeleteAlerts = /label\.(?<labelId>.+?)\.alerts\.delete/gimy.exec(p.action_id);
          if (isDeleteAlerts) {
            const labelId = isDeleteAlerts.groups?.labelId;
            const user = await getUserFromContext(context);
            const alerts = user.labels
              ?.filter(({ id }) => id === labelId)
              .at(0)
              ?.alertConfig.map((ac, index) => ({
                id: `${index}`,
                name: formatLabelAlert(ac)
              }));
            const deleteModalViewOpen = await client.views.push({
              trigger_id: body.trigger_id,
              view: getDeleteModal('alerts', `delete.label.${labelId}.alerts`, alerts || [])
            });
            if (!deleteModalViewOpen.ok) {
              throw Error(`Couldn't open DeleteLabels view because: ${deleteModalViewOpen.error}`);
            }
          }
          const isEditLabelAlert = /label\.(?<labelId>.+?)\.alerts\.edit\.(?<index>-?[0-9]+)/gimy.exec(p.action_id);
          if (isEditLabelAlert || p.action_id.startsWith('label.edit.')) {
            const labelId = isEditLabelAlert?.groups?.labelId ?? p.action_id.slice('label.edit.'.length);
            let label:
              | {
                  id: string;
                  name: string;
                  description?: string | undefined;
                  alertConfig: { summarizeAbove: number; onceInType: OnceIn; onceInValue: number; startOn: Date }[];
                }
              | undefined;
            if (labelId !== '$') {
              label = (await getUserFromContext(context)).labels?.filter(({ id }) => id === labelId).at(0);
              if (!label) {
                throw Error(
                  `Couldn't find label ${labelId} for ${{
                    userId: context.userId!,
                    teamOrgId: context.teamId!
                  }}`
                );
              }
            }
            if (!isEditLabelAlert) {
              const viewOpenRes = await client.views.open({
                trigger_id: body.trigger_id,
                view: getLabelEditModal(context.userId!, label)
              });
              if (!viewOpenRes.ok) {
                throw Error(`Couldn't open Label{${labelId}} view because: ${viewOpenRes.error}`);
              }
            } else {
              const index = parseInt(isEditLabelAlert.groups!.index!);
              const viewPushRes = await client.views.push({
                trigger_id: body.trigger_id,
                view: getAlertEditModal(labelId, index, index >= 0 ? label?.alertConfig.at(index) : {})
              });
              if (!viewPushRes.ok) {
                throw Error(`Couldn't push Label{${labelId}}Alert[${index}] view because: ${viewPushRes.error}`);
              }
            }
          }
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
