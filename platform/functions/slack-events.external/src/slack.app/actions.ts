import { SlackLogger } from '@hypsibius/knative-faas-utils';
import { PublishFunction } from '@hypsibius/knative-faas-utils/build/publish';
import { HypsibiusEvent, KnownActionFromType } from '@hypsibius/message-types';
import { OnceIn, User } from '@hypsibius/message-types/mongo';
import { formatLabelAlert } from '@hypsibius/message-types/utils';
import { App, Context as SlackContext } from '@slack/bolt';
import { getUser } from '../apis/mongo-manager';
import { getDeleteModal } from '../interactions/delete.modal';
import { getAlertEditModal } from '../interactions/edit-alert.modal';
import { getLabelEditModal } from '../interactions/edit-label.modal';

const getUserFromContext = async (context: SlackContext): Promise<User> => {
  return await getUser({
    userId: context.userId ?? 'Undefined UserID',
    teamOrgId: context.teamId ?? 'Undefined TeamOrgID',
    projection: {
      labels: true
    }
  });
};

export const handleActions = (app: App, logger: SlackLogger, publish: PublishFunction<HypsibiusEvent>): void => {
  app.action(/.*/gm, async ({ body, action, context, ack, client }) => {
    await ack();
    switch (body.type) {
      case 'block_actions': {
        const p = action as KnownActionFromType<typeof action.type>;
        const { ...slimBody } = body;
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
            ?.find(({ id }) => id === labelId)
            ?.alertConfig?.map((ac, index) => ({
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
        const isEditAlert = /label\.(?<labelId>.+?)\.alerts\.edit\.(?<index>-?[0-9]+)/gimy.exec(p.action_id);
        if (isEditAlert || p.action_id.startsWith('label.edit.')) {
          const labelId = isEditAlert?.groups?.labelId ?? p.action_id.slice('label.edit.'.length);
          const label:
            | {
                id: string;
                name: string;
                description?: string | undefined;
                alertConfig?: { summarizeAbove: number; onceInType: OnceIn; onceInValue: number; startOn: Date }[];
              }
            | undefined = (await getUserFromContext(context)).labels?.find(({ id }) => id === labelId);
          if (labelId !== '$' && !label) {
            throw Error(
              `Couldn't find label ${labelId} for ${{
                userId: context.userId ?? 'Undefined UserID',
                teamOrgId: context.teamId ?? 'Undefined TeamOrgID'
              }}`
            );
          }
          if (!isEditAlert) {
            if (context.userId) {
              const viewOpenRes = await client.views.open({
                trigger_id: body.trigger_id,
                view: getLabelEditModal(label)
              });
              if (!viewOpenRes.ok) {
                throw Error(`Couldn't open Label{${labelId}} view because: ${viewOpenRes.error}`);
              }
            } else {
              throw Error(`UserID is not defined`);
            }
          } else {
            let index = parseInt(isEditAlert.groups?.index ?? '-1');
            index = index === -1 ? label?.alertConfig?.length ?? 0 : index;
            const viewPushRes = await client.views.push({
              trigger_id: body.trigger_id,
              view: getAlertEditModal(labelId, index, {
                alertConfig: label?.alertConfig?.at(index) ?? {}
              })
            });
            if (!viewPushRes.ok) {
              throw Error(`Couldn't push Label{${labelId}}Alert[${index}] view because: ${viewPushRes.error}`);
            }
          }
        }
        break;
      }
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
};
