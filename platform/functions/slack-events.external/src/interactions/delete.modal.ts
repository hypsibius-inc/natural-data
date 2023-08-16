import { ModalView } from '@slack/bolt';

export const getDeleteModal = (
  deleteType: string,
  callbackId: string,
  values: { name: string; id: string }[]
): ModalView => ({
  type: 'modal',
  callback_id: callbackId,
  submit: {
    type: 'plain_text',
    text: 'Delete',
    emoji: true
  },
  close: {
    type: 'plain_text',
    text: 'Cancel',
    emoji: true
  },
  title: {
    type: 'plain_text',
    text: `Delete Labels`,
    emoji: true
  },
  blocks: [
    {
      type: 'input',
      dispatch_action: false,
      label: {
        type: 'plain_text',
        text: `Select which ${deleteType} you want to delete:`
      },
      element: {
        action_id: 'selected',
        type: 'multi_static_select',
        options: values.map((l) => ({
          text: {
            type: 'plain_text',
            text: l.name,
            emoji: true
          },
          value: l.id
        })),
        placeholder: {
          type: 'plain_text',
          text: `Select ${deleteType} to delete`
        }
      }
    }
  ]
});
