import { UserRequest, UserUpdateLabelsRequest } from '@hypsibius/message-types';
import { fillDefaultAlert, User } from '@hypsibius/message-types/mongo';
import { ArrayElement } from '@hypsibius/message-types/utils';
import { Context, StructuredReturn } from 'faas-js-runtime';
import mongoose from 'mongoose';

const MONGODB_CONNECTION: string = process.env.MONGODB_CONNECTION!;
if (!MONGODB_CONNECTION) {
  throw Error('Env var MONGODB_CONNECTION not set');
}

const init = async () => {
  await mongoose.connect(MONGODB_CONNECTION, {
    dbName: 'slack-conf'
  });
};

const handle = async (_context: Context, body: UserRequest): Promise<StructuredReturn> => {
  _context.log.info(`Processing ${JSON.stringify(body)}`);
  let query = User.findOne({
    ids: {
      $elemMatch: {
        userId: body.userId,
        teamOrgId: body.teamOrgId
      }
    }
  });
  switch (body.type) {
    case 'get':
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
    case 'update':
      const user = await query.exec();
      if (!user) {
        return {
          statusCode: 404,
          body: `${JSON.stringify(body)} Not found`
        };
      }
      body.labels?.map((l) => {
        const dbLabel = user.labels?.filter((dbl) => dbl.id === l.id).at(0);
        if (dbLabel) {
          dbLabel.name = l.name ?? dbLabel.name;
          dbLabel.description = l.description ?? dbLabel.description;
          Object.entries(l.alertConfig || {}).map(([i, a]) => {
            const index = parseInt(i);
            const startOn = typeof a.startOn === 'string' ? new Date(a.startOn) : a.startOn;
            if (index === -1) {
              dbLabel.alertConfig.push(fillDefaultAlert({...a, startOn}));
            } else {
              const dbAlert = dbLabel.alertConfig[index];
              dbAlert.onceInType = a.onceInType ?? dbAlert.onceInType;
              dbAlert.onceInValue = a.onceInValue ?? dbAlert.onceInValue;
              dbAlert.startOn = startOn ?? dbAlert.startOn;
              dbAlert.summarizeAbove = a.summarizeAbove ?? dbAlert.summarizeAbove;
            }
          });
          l.deleteAlerts?.sort((a, b) => b - a).map((i) => dbLabel.alertConfig.splice(i, 1));
        } else {
          const labels = user.labels || [];
          labels.push({
            id: l.id,
            name: l.name ?? l.id,
            description: l.description ?? l.id,
            alertConfig: (l.alertConfig ?? [{}]).map((ac: Omit<
              ArrayElement<NonNullable<ArrayElement<NonNullable<UserUpdateLabelsRequest['labels']>>['alertConfig']>>,
              'index'
            >) => fillDefaultAlert(ac))
          });
          user.labels = labels;
        }
      });
      const ret = await user.save();
      return {
        statusCode: 200,
        body: ret.toJSON()
      };
  }
};

export { handle, init };
