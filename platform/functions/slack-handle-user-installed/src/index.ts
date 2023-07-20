import { getSource } from '@hypsibius/knative-faas-utils';
import { EventsToTypes, SlackUserInstalledApp } from '@hypsibius/message-types';
import { InstallationHistory, User } from '@hypsibius/message-types/mongo';
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

/**
 * Your CloudEvents function, invoked with each request. This
 * is an example function which logs the incoming event and echoes
 * the received event data to the caller.
 *
 * It can be invoked with 'func invoke'.
 * It can be tested with 'npm test'.
 *
 * @param {Context} _context a context object.
 * @param {object} context.body the request body if any
 * @param {object} context.query the query string deserialzed as an object, if any
 * @param {object} context.log logging object with methods for 'info', 'warn', 'error', etc.
 * @param {object} context.headers the HTTP request headers
 * @param {string} context.method the HTTP request method
 * @param {string} context.httpVersion the HTTP protocol version
 * See: https://github.com/knative/func/blob/main/docs/guides/nodejs.md#the-context-object
 * @param {CloudEvent} cloudevent the CloudEvent
 */
const handle = async (
  _context: Context,
  cloudevent: CloudEvent<SlackUserInstalledApp>
): Promise<CloudEvent<EventsToTypes['error']> | StructuredReturn> => {
  const source = getSource();
  if (!cloudevent || !cloudevent.data) {
    const response: CloudEvent<EventsToTypes['error']> = new CloudEvent({
      type: 'error',
      data: new Error('No event received'),
      source: source
    });
    return response;
  }
  _context.log.info(`Received Event: ${JSON.stringify(cloudevent.data)}`);
  try {
    const id = {
      userId: cloudevent.data.installation.user.id,
      teamOrgId: cloudevent.data.installationId,
      isOrg: cloudevent.data.installation.isEnterpriseInstall || false,
      installation: (await InstallationHistory.findOne(
        { slackId: cloudevent.data.installationId },
        {
          _id: true
        },
        {
          sort: [
            {
              version: -1
            }
          ]
        }
      ).exec())!._id
    };
    _context.log.info(`Current ID is ${JSON.stringify(id)}`);
    const defaults = new User();
    const user = await User.findOneAndUpdate(
      {
        email: cloudevent.data.profile.email!
      },
      [
        {
          $set: {
            email: cloudevent.data.profile.email!,
            ids: {
              $ifNull: [
                {
                  $concatArrays: [
                    {
                      $ifNull: [
                        {
                          $filter: {
                            input: '$ids',
                            cond: {
                              $and: [
                                {
                                  $ne: ['$$this.teamOrgId', cloudevent.data.installationId]
                                },
                                {
                                  $ne: ['$$this.userId', cloudevent.data.installation.user.id]
                                }
                              ]
                            }
                          }
                        },
                        []
                      ]
                    },
                    [id]
                  ]
                },
                [id]
              ]
            },
            labels: {
              $ifNull: [
                "$labels",
                defaults.labels
              ]
            }
          }
        }
      ],
      {
        upsert: true,
        new: true,
        lean: true
      }
    ).exec();
    _context.log.warn(`Created user ${JSON.stringify(user)}`);
    return {
      statusCode: 200,
      body: user
    };
  } catch (e) {
    _context.log.error(JSON.stringify(e));
    const response: CloudEvent<EventsToTypes['error']> = new CloudEvent({
      type: 'error',
      data: e as Error,
      source: source
    });
    return response;
  }
};

export { handle, init };
