import {
  MongoRequest,
  UserUpdateLabelsRequest
} from '@hypsibius/message-types';
import {
  Channel,
  User,
  fillDefaultAlert
} from '@hypsibius/message-types/mongo';
import { ArrayElement } from '@hypsibius/message-types/utils';
import { Context, StructuredReturn } from 'faas-js-runtime';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';

const MONGODB_CONNECTION: string | undefined = process.env.MONGODB_CONNECTION;
if (!MONGODB_CONNECTION) {
  throw Error('Env var MONGODB_CONNECTION not set');
}

const init = async (): Promise<void> => {
  await mongoose.connect(MONGODB_CONNECTION, {
    dbName: 'slack-conf'
  });
};

const handle = async (
  _context: Context,
  body: MongoRequest
): Promise<StructuredReturn> => {
  _context.log.info(`Processing ${JSON.stringify(body)}`);
  try {
    switch (body.schema) {
      case 'User':
        {
          switch (body.type) {
            case 'get': {
              let query = User.findOne({
                ids: {
                  $elemMatch: {
                    userId: body.userId,
                    teamOrgId: body.teamOrgId
                  }
                }
              });
              if (body.projection) {
                query.projection(body.projection || {});
              }
              if (body.population) {
                query = query.populate(body.population || []);
              } else {
                query = query.lean();
              }
              const retVal = await query.exec();
              if (!retVal) {
                return {
                  statusCode: 404,
                  body: `${JSON.stringify(body)} Not found`
                };
              } else {
                return {
                  statusCode: 200,
                  body: 'toJSON' in retVal ? retVal.toJSON() : retVal
                };
              }
            }
            case 'update': {
              const user = await User.findOne({
                ids: {
                  $elemMatch: {
                    userId: body.userId,
                    teamOrgId: body.teamOrgId
                  }
                }
              }).exec();
              if (!user) {
                return {
                  statusCode: 404,
                  body: `${JSON.stringify(body)} Not found`
                };
              }
              body.labels?.forEach((l) => {
                const dbLabel = user.labels?.find((dbl) => dbl.id === l.id);
                const id = l.id === '$' ? l.name ?? l.id : l.id;
                if (dbLabel) {
                  dbLabel.id = id;
                  dbLabel.name = l.name ?? dbLabel.name;
                  dbLabel.description = l.description ?? dbLabel.description;
                  l.alertConfig?.map((a) => {
                    const startOn =
                      typeof a.startOn === 'string'
                        ? new Date(a.startOn)
                        : a.startOn;
                    if (
                      !dbLabel.alertConfig ||
                      a.index >= dbLabel.alertConfig.length
                    ) {
                      dbLabel.alertConfig ??= [];
                      dbLabel.alertConfig.push(
                        fillDefaultAlert({ ...a, startOn })
                      );
                    } else {
                      const dbAlert = dbLabel.alertConfig[a.index];
                      dbAlert.onceInType = a.onceInType ?? dbAlert.onceInType;
                      dbAlert.onceInValue =
                        a.onceInValue ?? dbAlert.onceInValue;
                      dbAlert.startOn = startOn ?? dbAlert.startOn;
                      dbAlert.summarizeAbove =
                        a.summarizeAbove ?? dbAlert.summarizeAbove;
                    }
                  });
                  dbLabel.alertConfig = dbLabel.alertConfig?.filter(
                    (_, i) => !l.deleteAlerts?.includes(i)
                  );
                } else {
                  const labels = user.labels || [];
                  labels.push({
                    id: id,
                    name: l.name ?? id,
                    description: l.description ?? id,
                    alertConfig: (l.alertConfig ?? [{}]).map(
                      (
                        ac: Omit<
                          ArrayElement<
                            NonNullable<
                              ArrayElement<
                                NonNullable<UserUpdateLabelsRequest['labels']>
                              >['alertConfig']
                            >
                          >,
                          'index'
                        >
                      ) => fillDefaultAlert(ac)
                    )
                  });
                  user.labels = labels;
                }
              });
              user.labels = user.labels
                ?.filter(({ id }) => !body.deleteLabelsById?.includes(id))
                .filter(
                  ({ name, description, alertConfig }) =>
                    name !== '$' ||
                    description !== '$' ||
                    (alertConfig && alertConfig.length > 0)
                );
              const ret = await user.save();
              return {
                statusCode: 200,
                body: ret.toJSON()
              };
            }
            case 'getByChannel': {
              let query = User.find({
                ids: {
                  $elemMatch: {
                    teamOrgId: body.teamOrgId
                  }
                },
                activeChannels: new ObjectId(body.channelObjectId)
              });
              if (body.projection) {
                query.projection(body.projection || {});
              }
              if (body.population) {
                query = query.populate(body.population || []);
              } else {
                query = query.lean();
              }
              const retVal = await query.exec();
              if (!retVal.length) {
                return {
                  statusCode: 404,
                  body: `${JSON.stringify(body)} Not found`
                };
              } else {
                return {
                  statusCode: 200,
                  body:
                    retVal.length && 'toJSON' in retVal[0]
                      ? retVal.map((u) => u.toJSON())
                      : retVal
                };
              }
            }
          }
        }
        break;
      case 'Channel': {
        switch (body.type) {
          case 'find': {
            let query = Channel.find({
              teamId: body.teamId,
              activeBot: body.activeBot,
              archived: body.archived,
              users: body.users
            });
            if (body.projection) {
              query.projection(body.projection || {});
            }
            if (body.population) {
              query = query.populate(body.population || []);
            } else {
              query = query.lean();
            }
            const retVal = await query.exec();
            if (!retVal) {
              return {
                statusCode: 404,
                body: `${JSON.stringify(body)} Not found`
              };
            } else {
              return {
                statusCode: 200,
                body:
                  retVal.length > 0 && 'toJSON' in retVal[0]
                    ? retVal.map((c) => c.toJSON())
                    : retVal
              };
            }
          }
          case 'get': {
            let query = Channel.findOne({
              teamId: body.teamId,
              id: body.channelId
            });
            if (body.projection) {
              query.projection(body.projection || {});
            }
            if (body.population) {
              query = query.populate(body.population || []);
            } else {
              query = query.lean();
            }
            const retVal = await query.exec();
            if (!retVal) {
              return {
                statusCode: 404,
                body: `${JSON.stringify(body)} Not found`
              };
            } else {
              return {
                statusCode: 200,
                body: 'toJSON' in retVal ? retVal.toJSON() : retVal
              };
            }
          }
        }
      }
    }
  } catch (e) {
    _context.log.error(e);
    return {
      statusCode: 500,
      body: JSON.stringify(e)
    };
  }
};

export { handle, init };
