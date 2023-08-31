import { SlackLogger } from '@hypsibius/knative-faas-utils';
import { OnceIn } from '@hypsibius/message-types/mongo';
import { App } from '@slack/bolt';
import { updateLabels } from '../apis/mongo-manager';
import { getLabelEditModal } from '../interactions/edit-label.modal';
import { buildHomeView } from './home-view';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handleViews = (app: App, _logger: SlackLogger): void => {
  const EditAlertCallbackID =
    /label\.(?<labelId>.+?)\.edit\.alert\.config\.(?<index>-?[0-9]+)/gimy;
  const EditLabelCallbackID = /label\.edit\.(?<labelId>.+)/gimy;
  const DeleteAlertsCallbackID = /delete\.label\.(?<labelId>.+)\.alerts/gimy;
  const DeleteLabelsCallbackID = /delete\.labels/gimy;
  app.view(EditAlertCallbackID, async ({ ack, context, view, client }) => {
    try {
      const { labelId, index } =
        EditAlertCallbackID.exec(view.callback_id)?.groups ?? {};
      const { startOn, summarizeAbove, onceInType, onceInValue } =
        Object.fromEntries(
          Object.values(view.state.values).flatMap((o) => Object.entries(o))
        );
      if (!context.userId || !context.teamId) {
        throw Error(`No UserId or TeamId defined`);
      }
      const user = await updateLabels({
        userId: context.userId,
        teamOrgId: context.teamId,
        labels: [
          {
            id: labelId,
            alertConfig: [
              {
                index: parseInt(index),
                onceInType: onceInType.selected_option?.value
                  ? Object.values(OnceIn).find(
                      (v) => v === onceInType.selected_option?.value
                    )
                  : undefined,
                onceInValue: onceInValue.value
                  ? parseInt(onceInValue.value)
                  : undefined,
                summarizeAbove: summarizeAbove.value
                  ? parseInt(summarizeAbove.value)
                  : undefined,
                startOn: startOn.selected_date_time
                  ? new Date(startOn.selected_date_time * 1000)
                  : undefined
              }
            ]
          }
        ]
      });
      const upRes = await client.views.update({
        view_id: view.previous_view_id ?? undefined,
        view: getLabelEditModal(user.labels?.find(({ id }) => id === labelId))
      });
      if (!upRes.ok) {
        await ack({
          response_action: 'errors',
          errors: {
            update: upRes.error || 'Failed to update label modal'
          }
        });
      } else {
        await ack();
      }
      await client.views.publish({
        view: await buildHomeView(context.teamId, context.userId),
        user_id: context.userId
      });
    } catch (e) {
      await ack({
        response_action: 'errors',
        errors: {
          error: JSON.stringify(e)
        }
      });
    }
  });
  app.view(DeleteAlertsCallbackID, async ({ ack, context, view, client }) => {
    try {
      const { labelId } =
        DeleteAlertsCallbackID.exec(view.callback_id)?.groups ?? {};
      _logger.error(`Deleting Alerts for label: ${labelId}`);
      const { selected } = Object.fromEntries(
        Object.values(view.state.values).flatMap((o) => Object.entries(o))
      );
      if (!context.userId || !context.teamId) {
        throw Error(`No UserId or TeamId defined`);
      }
      const deleteAlerts = selected.selected_options?.map<number>(({ value }) =>
        parseInt(value)
      );
      try {
        const user = await updateLabels({
          userId: context.userId,
          teamOrgId: context.teamId,
          labels: [
            {
              id: labelId,
              deleteAlerts
            }
          ]
        });
        _logger.info(JSON.stringify(user.labels));
        const upRes = await client.views.update({
          view_id: view.previous_view_id ?? undefined,
          view: getLabelEditModal(user.labels?.find(({ id }) => id === labelId))
        });
        if (!upRes.ok) {
          _logger.error(upRes.error);
          await ack({
            response_action: 'errors',
            errors: {
              update: upRes.error || 'Failed to update label modal'
            }
          });
        } else {
          _logger.info('Acking');
          await ack();
        }
        _logger.warn('Post-ack');
      } catch (e) {
        _logger.error(e);
        throw e;
      }
      await client.views.publish({
        view: await buildHomeView(context.teamId, context.userId),
        user_id: context.userId
      });
    } catch (e) {
      await ack({
        response_action: 'errors',
        errors: {
          error: JSON.stringify(e)
        }
      });
    }
  });
  app.view(EditLabelCallbackID, async ({ ack, context, view, client }) => {
    try {
      const { labelId } =
        EditLabelCallbackID.exec(view.callback_id)?.groups ?? {};
      const { name, description } = Object.fromEntries(
        Object.values(view.state.values).flatMap((o) => Object.entries(o))
      );
      if (!context.userId || !context.teamId) {
        throw Error(`No UserId or TeamId defined`);
      }
      await updateLabels({
        userId: context.userId,
        teamOrgId: context.teamId,
        labels: [
          {
            id: labelId,
            name: name.value ?? undefined,
            description: description.value ?? undefined
          }
        ]
      });
      const homeView = await buildHomeView(context.teamId, context.userId);
      const resp = await client.views.publish({
        view: homeView,
        user_id: context.userId
      });
      if (!resp.ok) {
        throw Error(JSON.stringify(resp));
      }
      await ack();
    } catch (e) {
      await ack({
        response_action: 'errors',
        errors: {
          error: JSON.stringify(e)
        }
      });
    }
  });
  app.view(DeleteLabelsCallbackID, async ({ ack, context, view, client }) => {
    try {
      const { selected } = Object.fromEntries(
        Object.values(view.state.values).flatMap((o) => Object.entries(o))
      );
      if (!context.userId || !context.teamId) {
        throw Error(`No UserId or TeamId defined`);
      }
      await updateLabels({
        userId: context.userId,
        teamOrgId: context.teamId,
        deleteLabelsById: selected.selected_options?.map<string>(
          ({ value }) => value
        )
      });
      const homeView = await buildHomeView(context.teamId, context.userId);
      const resp = await client.views.publish({
        view: homeView,
        user_id: context.userId
      });
      if (!resp.ok) {
        throw Error(JSON.stringify(resp));
      }
      await ack();
    } catch (e) {
      await ack({
        response_action: 'errors',
        errors: {
          error: JSON.stringify(e)
        }
      });
    }
  });
};
