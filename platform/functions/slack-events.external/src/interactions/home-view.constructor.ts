import { Channel, User } from '@hypsibius/message-types/mongo';
import { formatLabelAlert } from '@hypsibius/message-types/utils';
import { Button, HomeView, KnownBlock, PlainTextOption } from '@slack/web-api';

const getLabelName = (name: string) => (name === '$' ? '<Editing>' : `$${name}`);

const constructLabels = (labels: User['labels']): KnownBlock[] => {
  if (!labels) {
    return [];
  }
  return labels.flatMap((l) => [
    {
      type: 'divider'
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${getLabelName(l.name)}*\n- ${l.alertConfig?.map((ac) => formatLabelAlert(ac)).join('\n- ')}`
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
  const firstActiveChannel = user.activeChannels.at(0);
  if (user.activeChannels && firstActiveChannel && !('id' in firstActiveChannel)) {
    throw Error(`User's "activeChannels" field must be populated`);
  }
  const options = constructChannelOptions(channels);
  const selectedOptionsIds = getChannelIds((user.activeChannels || []) as Channel[]);
  const selectedOptions = options.filter((v) => selectedOptionsIds.includes(v.value || ''));
  const labels = constructLabels(user.labels);
  const deleteLabelsButton: Button[] = user.labels
    ? [
        {
          type: 'button',
          action_id: 'labels.delete',
          style: 'danger',
          text: {
            type: 'plain_text',
            text: 'Delete Labels',
            emoji: true
          }
        }
      ]
    : [];
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
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: 'label.edit.$',
            style: 'primary',
            text: {
              type: 'plain_text',
              text: 'New Label',
              emoji: true
            }
          },
          ...deleteLabelsButton
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Your Labels*'
        }
      },
      ...labels
    ]
  };
};
