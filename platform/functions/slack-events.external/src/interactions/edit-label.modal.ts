import { type User } from '@hypsibius/message-types/mongo';
import { ArrayElement, formatLabelAlert } from '@hypsibius/message-types/utils';
import { Button, ModalView } from '@slack/bolt';

export const getLabelEditModal = (userId: string, label?: ArrayElement<NonNullable<User['labels']>>): ModalView => {
  const labelId = label?.id ?? '$';
  const deleteAlertsButton: Button[] = label?.alertConfig
    ? [
        {
          type: 'button',
          action_id: `label.${labelId}.alerts.delete`,
          style: 'danger',
          text: {
            type: 'plain_text',
            text: 'Delete Alerts',
            emoji: true
          }
        }
      ]
    : [];
  return {
    type: 'modal',
    external_id: `${userId}/${labelId}`,
    callback_id: `label.edit.${labelId}`,
    submit: {
      type: 'plain_text',
      text: 'Save',
      emoji: true
    },
    close: {
      type: 'plain_text',
      text: 'Cancel',
      emoji: true
    },
    title: {
      type: 'plain_text',
      text: `Label Configuration`,
      emoji: true
    },
    blocks: [
      {
        type: 'input',
        element: {
          type: 'plain_text_input',
          action_id: `label.${labelId}.edit.name`,
          initial_value: label?.name ?? 'New Label'
        },
        label: {
          type: 'plain_text',
          text: 'Name',
          emoji: true
        }
      },
      {
        type: 'input',
        block_id: 'description',
        element: {
          type: 'plain_text_input',
          multiline: true,
          action_id: `label.${labelId}.edit.description`,
          placeholder: {
            type: 'plain_text',
            text: 'Write a detailed description to help the AI understand more accurately the purpose of the label',
            emoji: true
          },
          initial_value: label?.description || ''
        },
        label: {
          type: 'plain_text',
          text: 'Description',
          emoji: true
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Alerts',
          emoji: true
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: `label.${labelId}.alerts.edit.-1`,
            style: 'primary',
            text: {
              type: 'plain_text',
              text: 'New Alert',
              emoji: true
            }
          },
          ...deleteAlertsButton
        ]
      },
      ...(label?.alertConfig ?? []).map((ac, index) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: formatLabelAlert(ac)
        },
        accessory: {
          type: 'button',
          action_id: `label.${labelId}.alerts.edit.${index}`,
          text: {
            type: 'plain_text',
            text: 'Edit',
            emoji: true
          },
          value: `${index}`
        }
      }))
    ]
  };
};
