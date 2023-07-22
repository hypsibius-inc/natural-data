import { InstallationRequest } from '@hypsibius/message-types';
import { Installation } from '@hypsibius/message-types/mongo';
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

const handle = async (_context: Context, body: InstallationRequest): Promise<StructuredReturn> => {
  switch (body.type) {
    case 'set':
      try {
        await Installation.findByIdAndUpdate(
          body.id,
          {
            _id: body.id,
            payload: body.payload
          },
          {
            // Cannot set "projection", because there's a post-hook that
            // relies on the values of the response
            upsert: true,
            new: true,
            lean: true
          }
        ).exec();
        return {
          statusCode: 200
        };
      } catch (e) {
        _context.log.error(JSON.stringify(e));
        return {
          statusCode: 500
        };
      }
    case 'get':
      const getDoc = await Installation.findById(body.id).lean();
      if (!getDoc) {
        return {
          statusCode: 404,
          body: `Installation ${body.id} not found`
        };
      }
      return {
        body: getDoc
      };
    case 'delete':
      try {
        await Installation.findByIdAndDelete(body.id).exec();
        return {
          statusCode: 200
        };
      } catch (e) {
        _context.log.error(JSON.stringify(e));
        return {
          statusCode: 500,
          body: JSON.stringify(e)
        };
      }
  }
};

export { handle, init };
