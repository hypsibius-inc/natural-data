import { DefinedCloudEvent, assertNotEmptyCloudEventWithErrorLogging, asyncTryCatch } from '@hypsibius/knative-faas-utils';
import { SlackUserInstalledApp } from '@hypsibius/message-types';
import { InstallationHistory, User } from '@hypsibius/message-types/mongo';
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
    _context: Context,
    cloudevent: DefinedCloudEvent<SlackUserInstalledApp>
  ): Promise<DefinedCloudEvent<Error> | StructuredReturn> => {
    _context.log.info(`Received Event: ${JSON.stringify(cloudevent.data)}`);
    return await asyncTryCatch<StructuredReturn>(async () => {
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
                $ifNull: ['$labels', defaults.labels]
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
    });
  }
);

export { handle, init };
