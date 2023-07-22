import { EventsToTypes } from '@hypsibius/message-types';
import { CloudEvent } from 'cloudevents';
import { Context, StructuredReturn } from 'faas-js-runtime';

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
const handle = async (_context: Context, cloudevent: CloudEvent<EventsToTypes['error']>): Promise<StructuredReturn> => {
  _context.log.error(JSON.stringify(cloudevent.toJSON()));
  return {
    statusCode: 200
  };
};

export { handle };
