import { DefinedCloudEvent, assertNotEmptyCloudEventWithErrorLogging, asyncTryCatch } from '@hypsibius/knative-faas-utils';
import { HypsibiusSlackEvent } from '@hypsibius/message-types';
import { Channel } from '@hypsibius/message-types/mongo';
import { CloudEvent } from 'cloudevents';
import { Context, StructuredReturn } from 'faas-js-runtime';
import mongoose from 'mongoose';

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
    cloudevent: DefinedCloudEvent<HypsibiusSlackEvent<'member_joined_channel'>>
  ): Promise<StructuredReturn | CloudEvent<Error>> => {
    context.log.info(`Received Event: ${JSON.stringify(cloudevent.data)}`);
    return await asyncTryCatch(async () => {
      await Channel.findOneAndUpdate(
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
      );
      return {
        statusCode: 200
      };
    });
  }
);

export { handle, init };
