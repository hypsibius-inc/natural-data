import { Channel, User } from '@hypsibius/message-types/mongo';
import { Block, HomeView, PlainTextOption } from '@slack/web-api';

const constructLabels = (labels: User['labels']): Block[] => {
  if (!labels) {
    return [];
  }
  return labels.flatMap((l) => [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*$${l.name}*\n${l.alertConfig
          .map((ac) => `Every ${ac.onceInValue} ${ac.onceInType.toLowerCase()}, from ${ac.startOn.toLocaleString()}`)
          .join('\n')}`
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Edit',
          emoji: true
        },
        action_id: `label.edit.${l.id}`,
        value: `label.edit.${l.id}`
      }
    },
    {
      type: 'divider'
    }
  ]);
};

const constructChannelOptions = (channels: Channel[]): PlainTextOption[] =>
  channels.map((c) => ({
    text: {
      type: 'plain_text',
      text: c.name,
      emoji: true
    },
    value: c.id
  }));

const getChannelIds = (channels: Channel[]): string[] => channels.map((c) => c.id);

export const constructHomeView = (user: User, channels: Channel[]): HomeView => {
  if (user.activeChannels && user.activeChannels.at(0) && !('id' in user.activeChannels.at(0)!)) {
    throw Error(`User's "activeChannels" field must be populated`);
  }
  const options = constructChannelOptions(channels);
  const selectedOptionsIds = getChannelIds((user.activeChannels || []) as Channel[]);
  const selectedOptions = options.filter((v) => selectedOptionsIds.includes(v.value || ''));
  const labels = constructLabels(user.labels);
  return {
    type: 'home',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Welcome to Dini!'
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Add Channel',
              emoji: true
            },
            style: 'primary',
            value: 'add_channel'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'New Label',
              emoji: true
            },
            value: 'new_label'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Help',
              emoji: true
            },
            value: 'help'
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'image',
            image_url: 'https://api.slack.com/img/blocks/bkb_template_images/placeholder.png',
            alt_text: 'placeholder'
          }
        ]
      },
      {
        type: 'input',
        dispatch_action: true,
        label: {
          type: 'plain_text',
          text: 'Select the conversations in which to activate Dini:'
        },
        element: {
          action_id: 'conversations.select',
          type: 'multi_static_select',
          options: options,
          placeholder: {
            type: 'plain_text',
            text: 'Select conversations'
          },
          ...(selectedOptions.length
            ? {
                initial_options: selectedOptions
              }
            : {})
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'image',
            image_url: 'https://api.slack.com/img/blocks/bkb_template_images/placeholder.png',
            alt_text: 'placeholder'
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Your Labels*'
        }
      },
      {
        type: 'divider'
      },
      ...labels,
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'New Label',
              emoji: true
            },
            value: 'label.new'
          }
        ]
      }
    ]
  };
};
