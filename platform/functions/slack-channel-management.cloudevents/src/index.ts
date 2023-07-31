import {
  DefinedCloudEvent,
  SlackLogger,
  assertNotEmptyCloudEventWithErrorLogging,
  asyncTryCatch,
  getPublishFunction
} from '@hypsibius/knative-faas-utils';
import { ErrorEvent, HypsibiusEvent, HypsibiusSlackBlockAction, HypsibiusSlackEvent } from '@hypsibius/message-types';
import { Channel, User } from '@hypsibius/message-types/mongo';
import { ConversationsMembersResponse, WebClient } from '@slack/web-api';
import { CloudEvent } from 'cloudevents';
import { Context, Logger, StructuredReturn } from 'faas-js-runtime';
import mongoose from 'mongoose';

const publish = getPublishFunction<HypsibiusEvent>();
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
      | HypsibiusSlackBlockAction<'multi_static_select'>
    >
  ): Promise<StructuredReturn | CloudEvent<ErrorEvent>> => {
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
            const info = await client.conversations.info({
              channel: cloudevent.data.payload.channel
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
                },
                ...(info && info.channel
                  ? {
                      $set: {
                        name: info.channel.name,
                        info: info.channel
                      }
                    }
                  : {})
              }
            );
            await publish({
              data: {
                type: 'hypsibius.slack.app_joined_channel',
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
              data: {
                type: 'hypsibius.slack.app_left_channel',
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
              data: {
                type: 'hypsibius.error',
                error: Error(`No teamId or botUserId in context: ${JSON.stringify(cloudevent.data.context)}`)
              }
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
                data: {
                  type: 'hypsibius.slack.app_left_channel',
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
              data: {
                error: Error(`No teamId or botUserId in context: ${JSON.stringify(cloudevent.data.context)}`),
                type: 'hypsibius.error'
              }
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
                data: {
                  type: 'hypsibius.slack.app_left_channel',
                  teamId: cloudevent.data.context.teamId,
                  channelId: cloudevent.data.payload.channel,
                  remover: cloudevent.data.payload.actor_id,
                  members: prevLeftChannel.users
                }
              });
            }
          }
          break;
        case 'multi_static_select':
          const channels = await Channel.find({
            teamId: cloudevent.data.context.teamId,
            id: {$in: cloudevent.data.payload.selected_options.map(({value}) => value)},
          }, {
            _id: true
          }).lean();
          await User.findOneAndUpdate({
            ids: {
              $elemMatch: {
                teamOrgId: cloudevent.data.context.teamId,
                userId: cloudevent.data.context.userId
              }
            }
          },
          {
            $set: {
              activeChannels: channels.map((v) => v._id)
            }
          })
          break;
      }
      return {
        statusCode: 200
      };
    });
  }
);

export { handle, init };
