import {
  DefinedCloudEvent,
  SlackLogger,
  assertNotEmptyCloudEventWithErrorLogging,
  getPublishFunction
} from '@hypsibius/knative-faas-utils';
import { HypsibiusEvent, HypsibiusSlackEvent } from '@hypsibius/message-types';
import { Channel, User } from '@hypsibius/message-types/mongo';
import { LogLevel, WebClient } from '@slack/web-api';
import { Context, Logger, StructuredReturn } from 'faas-js-runtime';
import mongoose from 'mongoose';
import { constructHomeView } from './home-view.constructor';

const publish = getPublishFunction<HypsibiusEvent>();
const MONGODB_CONNECTION: string = process.env.MONGODB_CONNECTION!;
if (!MONGODB_CONNECTION) {
  throw Error('Env var MONGODB_CONNECTION not set');
}

const init = () => {
  mongoose.connect(MONGODB_CONNECTION, {
    dbName: 'slack-conf'
  });
};

let logger: SlackLogger;

function initialize(log: Logger): SlackLogger {
  if (!logger) {
    logger = new SlackLogger(log);
  }
  return logger;
}

const handle = assertNotEmptyCloudEventWithErrorLogging(
  async (
    context: Context,
    cloudevent: DefinedCloudEvent<HypsibiusSlackEvent<'app_home_opened'>>
  ): Promise<StructuredReturn> => {
    context.log.info(`Received Event: ${JSON.stringify(cloudevent.data)}`);
    const user = await User.findOne({
      ids: {
        $elemMatch: {
          teamOrgId: cloudevent.data.context.teamId,
          userId: cloudevent.data.payload.user
        }
      }
    })
      .populate('activeChannels')
      .lean()
      .exec();
    if (!user) {
      throw Error(`Couldn't find user ${cloudevent.data.payload.user} at ${cloudevent.data.context.teamId}`);
    }
    const channels = await Channel.find(
      {
        teamId: cloudevent.data.context.teamId,
        activeBot: true,
        archived: false,
        users: cloudevent.data.payload.user
      },
      {
        _id: false,
        id: true,
        name: true
      }
    ).lean();
    const client = new WebClient(cloudevent.data.context.botToken, {
      logger: initialize(context.log),
      logLevel: LogLevel.DEBUG
    });
    const view = constructHomeView(user, channels);
    const resp = await client.views.publish({
      view: view,
      user_id: cloudevent.data.payload.user
    });
    if (!resp.ok) {
      throw Error(JSON.stringify(resp));
    }
    await publish({
      data: {
        type: 'hypsibius.slack.send_message',
        webClientParams: {
          token: cloudevent.data.context.botToken!
        },
        args: {
          channel: cloudevent.data.payload.channel,
          text: `Hi <@${cloudevent.data.payload.user}>`
        }
      }
    });
    return {
      statusCode: 200
    };
  },
  {
    deferredLogger: (context: Context) => initialize(context.log)
  }
);

export { handle, init };
