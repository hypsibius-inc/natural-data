import { CloudEvent } from 'cloudevents';
import { GetSourceOptions, getSource } from './consts';

export interface DefinedCloudEvent<T = undefined> extends CloudEvent<T> {
  data: T;
}

export interface AssertNotEmptyCloudEventOptions {
  message?: string;
  sourceOptions?: GetSourceOptions;
}

const AssertNotEmptyCloudEventOptionsDefaults: Required<AssertNotEmptyCloudEventOptions> = {
  message: 'Empty CloudEvent',
  sourceOptions: {}
};

export const getErrorCloudEvent = (e: string | Error, sourceOptions?: GetSourceOptions): DefinedCloudEvent<Error> => {
  return new CloudEvent({
    type: 'error',
    data: typeof e === 'string' ? Error(e) : e,
    source: getSource(sourceOptions)
  }) as DefinedCloudEvent<Error>;
};

export const assertNotEmptyCloudEvent = <T, P, C>(
  callback: (context: C, cloudevent: DefinedCloudEvent<T>) => Promise<P>,
  options: AssertNotEmptyCloudEventOptions = AssertNotEmptyCloudEventOptionsDefaults
): ((context: C, cloudevent?: CloudEvent<T>) => Promise<DefinedCloudEvent<Error> | P>) => {
  const calcOptions: Required<AssertNotEmptyCloudEventOptions> = {
    ...AssertNotEmptyCloudEventOptionsDefaults,
    ...options
  };
  return async (context: C, cloudevent?: CloudEvent<T>): Promise<DefinedCloudEvent<Error> | P> => {
    if (!cloudevent || cloudevent.data === undefined || cloudevent.data === null) {
      return getErrorCloudEvent(calcOptions.message, calcOptions.sourceOptions);
    }
    return callback(context, cloudevent as DefinedCloudEvent<T>);
  };
};

export const tryCatch = <T = undefined>(
  callback: () => T,
  sourceOptions?: GetSourceOptions
): T | DefinedCloudEvent<Error> => {
  try {
    return callback();
  } catch (e) {
    if (e instanceof Error) {
      return getErrorCloudEvent(e, sourceOptions);
    } else {
      return getErrorCloudEvent(JSON.stringify(e), sourceOptions);
    }
  }
};

export const asyncTryCatch = async <R = undefined, T extends Promise<R> = Promise<R>>(
  callback: () => T,
  sourceOptions?: GetSourceOptions
): Promise<R | DefinedCloudEvent<Error>> => {
  try {
    return await callback();
  } catch (e) {
    if (e instanceof Error) {
      return getErrorCloudEvent(e, sourceOptions);
    } else {
      return getErrorCloudEvent(JSON.stringify(e), sourceOptions);
    }
  }
};
