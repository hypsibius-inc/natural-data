import { CloudEvent, emitterFor, httpTransport } from 'cloudevents';
import { CloudEventV1OptionalAttributes } from 'cloudevents/dist/event/interfaces';
import { GetSinkOptions, GetSourceOptions, getSink, getSource } from './consts';
import { ConditionalFunc } from './utils/typing';

export interface PublishFunctionGenerationOptions extends GetSourceOptions, GetSinkOptions {}

type publishReturnType<T> = {
  [Key in keyof T]: Promise<CloudEvent<T[Key]>>;
};

type extraParam<T> = {
  [Key in keyof T]: Omit<CloudEventV1OptionalAttributes<T[Key]>, 'data'>;
};

export type PublishFunction<T> = ConditionalFunc<T, publishReturnType<T>, extraParam<T>>;

export const getPublishFunction = <T>(options?: PublishFunctionGenerationOptions): PublishFunction<T> => {
  const emitter = emitterFor(httpTransport(getSink(options)));
  const source = getSource(options);
  return async <Key extends keyof T>(args: { type: Key; data: T[Key]; extra?: object }) => {
    const ce = new CloudEvent({
      ...(typeof args.data === 'object' && args.data && 'context' in args.data ? args.data.context || {} : {}),
      type: String(args.type),
      source: source,
      data: args.data,
      ...(args.extra || {})
    });
    await emitter(ce);
    return ce;
  };
};
