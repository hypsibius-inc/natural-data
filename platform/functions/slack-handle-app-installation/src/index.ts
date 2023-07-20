import { SlackLogger, getPublishFunction, getSource } from '@hypsibius/knative-faas-utils';
import { EventsToTypes, SlackAppInstallationSuccess } from '@hypsibius/message-types';
import { CloudEvent } from 'cloudevents';
import { Context, Logger, StructuredReturn } from 'faas-js-runtime';
import { WebClient } from '@slack/web-api';

const publish = getPublishFunction<EventsToTypes>();

let logger: SlackLogger;

function initialize(log: Logger): SlackLogger {
  if (!logger) {
    logger = new SlackLogger(log);
  }
  return logger;
}

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
  cloudevent?: CloudEvent<SlackAppInstallationSuccess>
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
    const api = new WebClient(cloudevent.data.payload.bot!.token, {
      logger: initialize(_context.log)
    });
    for (const conv of (await api.conversations.list({})).channels || []) {
      if (!conv.is_im && !conv.is_private && !conv.is_member) {
        const resp = await api.conversations.join({
          channel: conv.id!
        });
        if (!resp.ok) {
          _context.log.error(`Failed to join channel ${conv.id} with message: ${resp.error}`);
        }
      }
    }
    try {
      const profile = await api.users.profile.get({
        user: cloudevent.data.payload.user.id
      });
      if (profile.ok && profile.profile) {
        await publish({
          type: 'slack_user_installed_app',
          data: {
            installation: cloudevent.data.payload,
            installationId: cloudevent.data.id,
            profile: profile.profile
          }
        });
      } else {
        _context.log.error(`Profile of ${cloudevent.data.payload.user.id} returned empty`);
        const response: CloudEvent<EventsToTypes['error']> = new CloudEvent({
          type: 'error',
          data: new Error(`Profile of ${cloudevent.data.payload.user.id} returned empty`),
          source: source
        });
        return response;
      }
    } catch (e) {
      _context.log.error(JSON.stringify(e));
      const response: CloudEvent<EventsToTypes['error']> = new CloudEvent({
        type: 'error',
        data: e as Error,
        source: source
      });
      return response;
    }
  } catch (e) {
    _context.log.error(JSON.stringify(e));
    const response: CloudEvent<EventsToTypes['error']> = new CloudEvent({
      type: 'error',
      data: e as Error,
      source: source
    });
    return response;
  }
  return {
    statusCode: 200
  };
};

export { handle };
