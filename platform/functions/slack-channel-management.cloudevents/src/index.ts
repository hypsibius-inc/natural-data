import {
  DefinedCloudEvent,
  SlackLogger,
  assertNotEmptyCloudEventWithErrorLogging,
  asyncTryCatch,
  getPublishFunction
} from '@hypsibius/knative-faas-utils';
import { EventsToTypes, HypsibiusSlackEvent } from '@hypsibius/message-types';
import { Channel } from '@hypsibius/message-types/mongo';
import { CloudEvent } from 'cloudevents';
import { Context, Logger, StructuredReturn } from 'faas-js-runtime';
import { ConversationsMembersResponse, WebClient } from '@slack/web-api';
import mongoose from 'mongoose';

const publish = getPublishFunction<EventsToTypes>();
let logger: SlackLogger;

function initialize(log: Logger): SlackLogger {
  if (!logger) {
    logger = new SlackLogger(log);
  }
  return logger;
}

const MONGODB_CONNECTION: string = process.env.MONGODB_CONNECTION!;
if (!MONGODB_CONNECTION) {
  throw Error('Env var MONGODB_CONNECTION not set');
}

const init = () => {
  mongoose.connect(MONGODB_CONNECTION, {
    dbName: 'slack-conf'
  });
};

const handle = assertNotEmptyCloudEventWithErrorLogging(
  async (
    context: Context,
    cloudevent: DefinedCloudEvent<
      | HypsibiusSlackEvent<'member_joined_channel'>
      | HypsibiusSlackEvent<'member_left_channel'>
      | HypsibiusSlackEvent<'channel_left'>
      | HypsibiusSlackEvent<'group_left'>
    >
  ): Promise<StructuredReturn | CloudEvent<Error>> => {
    return await asyncTryCatch(async () => {
      switch (cloudevent.data.payload.type) {
        case 'member_joined_channel':
          const prev = await Channel.findOneAndUpdate(
            {
              teamId: cloudevent.data.payload.team,
              id: cloudevent.data.payload.channel
            },
            {
              $set: {
                teamId: cloudevent.data.payload.team,
                id: cloudevent.data.payload.channel,
                archived: false,
                activeBot:
                  cloudevent.data.payload.user === cloudevent.data.context.botUserId
                    ? true
                    : {
                        $ifNull: ['$activeBot', false]
                      }
              },
              $addToSet: {
                users: [cloudevent.data.payload.user]
              }
            },
            {
              upsert: true
            }
          ).lean();
          if ((!prev || !prev.activeBot) && cloudevent.data.payload.user === cloudevent.data.context.botUserId) {
            const client = new WebClient(cloudevent.data.context.botToken, {
              logger: initialize(context.log)
            });
            const allMembers: string[] = [];
            for await (const page of client.paginate('conversations.members', {
              channel: cloudevent.data.payload.channel
            })) {
              allMembers.push(...((page as ConversationsMembersResponse).members || []));
            }
            await Channel.findOneAndUpdate(
              {
                teamId: cloudevent.data.payload.team,
                id: cloudevent.data.payload.channel
              },
              {
                $addToSet: {
                  users: {
                    $each: allMembers
                  }
                }
              }
            );
            await publish({
              type: 'slack_app_joined_channel',
              data: {
                teamId: cloudevent.data.payload.team,
                channelId: cloudevent.data.payload.channel,
                inviter: cloudevent.data.payload.inviter,
                members: allMembers
              }
            });
          }
          break;
        case 'member_left_channel':
          const prevLeft = await Channel.findOneAndUpdate(
            {
              teamId: cloudevent.data.payload.team,
              id: cloudevent.data.payload.channel
            },
            {
              $set: {
                activeBot: cloudevent.data.payload.user === cloudevent.data.context.botUserId ? false : '$activeBot'
              },
              $pull: {
                users: cloudevent.data.payload.user
              }
            }
          );
          if (prevLeft && prevLeft.activeBot && cloudevent.data.payload.user === cloudevent.data.context.botUserId) {
            await publish({
              type: 'slack_app_left_channel',
              data: {
                teamId: cloudevent.data.payload.team,
                channelId: cloudevent.data.payload.channel,
                members: prevLeft.users
              }
            });
          }
          break;
        case 'channel_left':
          if (!cloudevent.data.context.teamId || !cloudevent.data.context.botUserId) {
            await publish({
              type: 'error',
              data: Error(`No teamId or botUserId in context: ${JSON.stringify(cloudevent.data.context)}`)
            });
          } else {
            const prevLeftChannel = await Channel.findOneAndUpdate(
              {
                teamId: cloudevent.data.context.teamId,
                id: cloudevent.data.payload.channel
              },
              {
                $set: {
                  activeBot: false
                },
                $pull: {
                  users: cloudevent.data.context.botUserId
                }
              }
            );
            if (prevLeftChannel) {
              await publish({
                type: 'slack_app_left_channel',
                data: {
                  teamId: cloudevent.data.context.teamId,
                  channelId: cloudevent.data.payload.channel,
                  remover: cloudevent.data.payload.actor_id,
                  members: prevLeftChannel.users
                }
              });
            }
          }
          break;
        case 'group_left':
          if (!cloudevent.data.context.teamId || !cloudevent.data.context.botUserId) {
            await publish({
              type: 'error',
              data: Error(`No teamId or botUserId in context: ${JSON.stringify(cloudevent.data.context)}`)
            });
          } else {
            const prevLeftChannel = await Channel.findOneAndUpdate(
              {
                teamId: cloudevent.data.context.teamId,
                id: cloudevent.data.payload.channel
              },
              {
                $set: {
                  activeBot: false
                },
                $pull: {
                  users: cloudevent.data.context.botUserId
                }
              }
            );
            if (prevLeftChannel) {
              await publish({
                type: 'slack_app_left_channel',
                data: {
                  teamId: cloudevent.data.context.teamId,
                  channelId: cloudevent.data.payload.channel,
                  remover: cloudevent.data.payload.actor_id,
                  members: prevLeftChannel.users
                }
              });
            }
          }
          break;
      }
      return {
        statusCode: 200
      };
    });
  }
);

export { handle, init };
