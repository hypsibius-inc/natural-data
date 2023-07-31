import { CloudEvent, emitterFor, httpTransport } from 'cloudevents';
import { CloudEventV1OptionalAttributes } from 'cloudevents/dist/event/interfaces';
import { DefinedCloudEvent } from './cloudevents';
import { GetSinkOptions, GetSourceOptions, getSink, getSource } from './consts';
import { ConditionalFunc, TypedObject, TypedObjectExtractor } from './utils/typing';
import { Context } from 'faas-js-runtime';

export interface PublishFunctionGenerationOptions extends GetSourceOptions, GetSinkOptions {}

type publishReturnType<T extends TypedObject> = {
  [Key in T['type']]: Promise<DefinedCloudEvent<TypedObjectExtractor<T, Key>>>;
};

type extraParam<T extends TypedObject> = {
  [Key in T['type']]: Omit<CloudEventV1OptionalAttributes<TypedObjectExtractor<T, Key>>, 'data'>;
};

export type PublishFunction<T extends TypedObject> = ConditionalFunc<T, publishReturnType<T>, extraParam<T>>;

const cloudeventAttributeName = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

const cloudEventAttributes = (o?: object): object => {
  console.warn(`Converting ${JSON.stringify(o)} to cloudAttributes`);
  return Object.fromEntries(
    Object.entries(o || {})
      .filter(([_, v]) => ["object", "string", "number", "boolean"].includes(typeof v))
      .map(([k, v]) => [cloudeventAttributeName(k), v])
  );
};

export const getPublishFunction = <T extends TypedObject>(
  options?: PublishFunctionGenerationOptions
): PublishFunction<T> => {
  const emitter = emitterFor(httpTransport(getSink(options)));
  const source = getSource(options);
  return async <K extends T['type'], V extends TypedObjectExtractor<T, K>>(args: {
    data: V & { type: K };
    extra?: object;
  }): Promise<DefinedCloudEvent<V>> => {
    const extraAttributes = {
      ...cloudEventAttributes(
        typeof args.data === 'object' && args.data && 'context' in args.data ? (args.data.context as Context) : {}
      ),
      ...cloudEventAttributes(args.extra),
    }
    console.error(`EXTRA attributes: ${JSON.stringify(extraAttributes)}`)
    const ce = new CloudEvent({
      ...extraAttributes,
      type: args.data.type,
      source: source,
      data: args.data
    });
    await emitter(ce);
    return ce as DefinedCloudEvent<V>;
  };
};
