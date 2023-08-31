import {
  DefinedCloudEvent,
  assertNotEmptyCloudEventWithErrorLogging,
  getPublishFunction
} from '@hypsibius/knative-faas-utils';
import {
  ErrorEvent,
  HypsibiusEventFromType,
  HypsibiusSlackEvent
} from '@hypsibius/message-types';
import { Channel, User } from '@hypsibius/message-types/mongo';
import { Context, Logger, StructuredReturn } from 'faas-js-runtime';
import { getChannel, getUsersByChannel } from './apis/mongo-manager';
import { getClassifications } from './apis/text-classification';

type MessageData = {
  team: string;
  user: string;
  text: string;
  channel: string;
  ts: string;
};
const publish = getPublishFunction<
  | HypsibiusEventFromType<'hypsibius.slack.labelled_message'>
  | HypsibiusEventFromType<'hypsibius.slack.send_message'>
>();

const getMessageData = ({
  payload,
  context
}: Omit<HypsibiusSlackEvent<'message'>, 'type'>): MessageData | undefined => {
  switch (payload.subtype) {
    case undefined: {
      const team = payload.team ?? context.teamId;
      if (!team || !payload.text) return;
      return {
        team,
        channel: payload.channel,
        text: payload.text,
        user: payload.user,
        ts: payload.ts
      };
    }
    case 'message_changed':
      if (!context.teamId) return;
      return getMessageData({ context, payload: payload.message });
    default:
      return;
  }
};

const handleUser = async (
  logger: Logger,
  messageData: MessageData,
  user: User,
  channel: Channel,
  token: string
): Promise<undefined> => {
  const userId = user.ids.find(({ teamOrgId }) => teamOrgId === channel.teamId);
  const zeroShotLabelsMap = Object.fromEntries(
    user.labels?.map((l) => [l.description ?? l.name, l.name]) ?? []
  );
  const zeroShotLabels = Object.keys(zeroShotLabelsMap);
  if (!userId || !zeroShotLabels) {
    logger.error(
      `UserID or ZeroShotLabels is undefined. ${userId}, ${zeroShotLabels}`
    );
    return;
  }
  const classifications = (
    await getClassifications({
      text: [messageData.text],
      zero_shot_labels: zeroShotLabels,
      options: {
        classifiers: ['zero_shot']
      }
    })
  ).at(0);
  if (!classifications?.zero_shot) {
    logger.error(`Classification is undefined. ${classifications?.zero_shot}`);
    return;
  }
  const translated = Object.fromEntries(
    Object.entries(classifications.zero_shot).map(([k, v]) => [
      zeroShotLabelsMap[k],
      v
    ])
  );
  logger.info(`Classifications are: ${JSON.stringify(translated)}`);
  await publish({
    data: {
      type: 'hypsibius.slack.labelled_message',
      channelId: channel.id,
      senderId: messageData.user,
      teamId: messageData.team,
      text: messageData.text,
      ts: messageData.ts,
      userId: userId.userId,
      webClientParams: {
        token
      },
      labels: translated
    }
  });
  await publish({
    data: {
      type: 'hypsibius.slack.send_message',
      args: {
        channel: userId.userId,
        text: `Labelled "${messageData.text}" from <@${
          messageData.user
        }> in <#${messageData.channel}> as ${JSON.stringify(
          translated,
          null,
          2
        )}`
      },
      webClientParams: {
        token
      }
    }
  });
  return;
};

const handle = assertNotEmptyCloudEventWithErrorLogging(
  async (
    context: Context,
    cloudevent: DefinedCloudEvent<HypsibiusSlackEvent<'message'>>
  ): Promise<DefinedCloudEvent<ErrorEvent> | StructuredReturn> => {
    try {
      context.log.warn(`Received ${JSON.stringify(cloudevent.data)}`);
      const token =
        cloudevent.data.context.botToken ?? cloudevent.data.context.userToken;
      if (!token) {
        throw Error('Token is undefined');
      }
      const messageData = getMessageData(cloudevent.data);
      if (!messageData) {
        throw Error(`MessageData is undefined, original: ${cloudevent.data}`);
      }
      if (!cloudevent.data.context.teamId) {
        throw Error(`TeamId in context is undefined`);
      }
      const channel = await getChannel({
        teamId: cloudevent.data.context.teamId,
        channelId: messageData.channel
      });
      const users = await getUsersByChannel({
        teamOrgId: cloudevent.data.context.teamId,
        channelObjectId: channel._id.toString()
      });
      context.log.info(
        `${channel.name} received message for ${users.map(
          ({ email }) => email
        )}`
      );
      await Promise.all(
        (users ?? []).map((user) =>
          handleUser(context.log, messageData, user, channel, token)
        )
      );
    } catch (e) {
      context.log.error(e);
      throw e;
    }
    return {
      statusCode: 200
    };
  }
);

export { handle };
