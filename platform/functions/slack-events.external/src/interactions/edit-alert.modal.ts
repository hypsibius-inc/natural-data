import { OnceIn, fillDefaultAlert, type User } from '@hypsibius/message-types/mongo';
import { ArrayElement } from '@hypsibius/message-types/utils';
import { ModalView, PlainTextOption } from '@slack/bolt';

const options: PlainTextOption[] = Object.values(OnceIn).map((v) => ({
  text: {
    type: 'plain_text',
    text: `${v.charAt(0).toUpperCase()}${v.slice(1).toLowerCase()}`
  },
  value: v
}));

const defaultViewValues: ModalView = {
  type: 'modal',
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
    text: `Alert Config`,
    emoji: true
  },
  blocks: []
};

export const getAlertEditModal = (
  labelId: string,
  alertIndex: number,
  extra: {
    alertConfig?: Partial<ArrayElement<NonNullable<ArrayElement<NonNullable<User['labels']>>['alertConfig']>>>;
    metadata?: string;
  }
): ModalView => {
  const { alertConfig, metadata } = extra;
  const startOn = typeof alertConfig?.startOn === 'string' ? new Date(alertConfig.startOn) : alertConfig?.startOn;
  const ac = fillDefaultAlert({ ...alertConfig, startOn });
  return {
    ...defaultViewValues,
    private_metadata: metadata,
    callback_id: `label.${labelId}.edit.alert.config.${alertIndex}`,
    blocks: [
      {
        type: 'input',
        label: {
          type: 'plain_text',
          text: 'Every',
          emoji: true
        },
        element: {
          type: 'number_input',
          is_decimal_allowed: true,
          initial_value: `${ac.onceInValue}`,
          min_value: '0',
          max_value: '1000',
          action_id: `onceInValue`
        }
      },
      {
        type: 'input',
        label: {
          type: 'plain_text',
          text: '(Scale)',
          emoji: true
        },
        element: {
          action_id: `onceInType`,
          type: 'static_select',
          options: options,
          initial_option: options.filter((v) => v.value === ac.onceInType)[0]
        }
      },
      {
        type: 'input',
        label: {
          type: 'plain_text',
          text: 'Starting on'
        },
        element: {
          type: 'datetimepicker',
          action_id: `startOn`,
          initial_date_time: Math.floor(ac.startOn.getTime() / 1000)
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'input',
        element: {
          type: 'number_input',
          is_decimal_allowed: false,
          initial_value: `${ac.summarizeAbove}`,
          min_value: '-1',
          max_value: '100',
          action_id: `summarizeAbove`
        },
        label: {
          type: 'plain_text',
          text: 'Summarize above (-1 for never)',
          emoji: true
        }
      }
    ]
  };
};
