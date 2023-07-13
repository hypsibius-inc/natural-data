import { emitterFor, httpTransport, CloudEvent } from 'cloudevents';
import { CloudEventV1OptionalAttributes } from 'cloudevents/dist/event/interfaces';
import { GetSinkOptions, GetSourceOptions, getSink, getSource } from './consts';

export interface PublishFunctionGenerationOptions extends GetSourceOptions, GetSinkOptions {}

export type PublishFunction<T> = (
  type: string,
  data: T,
  extra?: CloudEventV1OptionalAttributes<T>
) => Promise<CloudEvent<T>>;

export const getPublishFunction = <T>(options?: PublishFunctionGenerationOptions): PublishFunction<T> => {
  const emitter = emitterFor(httpTransport(getSink(options)));
  const source = getSource(options);
  return async <T>(type: string, data: T, extra?: CloudEventV1OptionalAttributes<T>): Promise<CloudEvent<T>> => {
    const ce = new CloudEvent<T>({ type: type, source: source, data: data, ...extra });
    await emitter(ce);
    return ce;
  };
};
