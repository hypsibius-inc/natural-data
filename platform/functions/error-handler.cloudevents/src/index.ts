import { ErrorEvent } from '@hypsibius/message-types';
import { CloudEvent } from 'cloudevents';
import { Context, StructuredReturn } from 'faas-js-runtime';

const handle = async (context: Context, cloudevent: CloudEvent<ErrorEvent>): Promise<StructuredReturn> => {
  context.log.error(JSON.stringify(cloudevent.toJSON()));
  return {
    statusCode: 200
  };
};

export { handle };
