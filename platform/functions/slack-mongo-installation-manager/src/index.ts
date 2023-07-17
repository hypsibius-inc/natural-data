import { EventsToTypes } from '@hypsibius/message-types';
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

/**
 * Your HTTP handling function, invoked with each request. This is an example
 * function that logs the incoming request and echoes its input to the caller.
 *
 * It can be invoked with `func invoke`
 * It can be tested with `npm test`
 *
 * It can be invoked with `func invoke`
 * It can be tested with `npm test`
 *
 * @param {Context} context a context object.
 * @param {object} context.body the request body if any
 * @param {object} context.query the query string deserialized as an object, if any
 * @param {object} context.log logging object with methods for 'info', 'warn', 'error', etc.
 * @param {object} context.headers the HTTP request headers
 * @param {string} context.method the HTTP request method
 * @param {string} context.httpVersion the HTTP protocol version
 * See: https://github.com/knative/func/blob/main/docs/guides/nodejs.md#the-context-object
 */
const handle = async (_context: Context, body: EventsToTypes['installation_request']): Promise<StructuredReturn> => {
  switch (body.type) {
    case 'set':
      const setDoc = await Installation.findOneAndUpdate(
        { slackId: body.id },
        {
          slackId: body.id,
          payload: body.payload
        },
        {
          upsert: true,
          lean: true,
          new: true,
          projection: {
            _id: false
          }
        }
      ).exec();
      return {
        body: setDoc
      };
    case 'get':
      const getDoc = await Installation.findOne({ slackId: body.id }, { _id: false }, { lean: true }).exec();
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
      const deleted = await Installation.deleteOne({ slackId: body.id }).exec();
      if (!deleted.acknowledged) {
        return {
          statusCode: 500,
          body: `Failed to delete ${body.id}`
        };
      }
      return {
        body: `Deleted (${deleted.deletedCount}) ${body.id}`
      };
  }
};

export { handle, init };
