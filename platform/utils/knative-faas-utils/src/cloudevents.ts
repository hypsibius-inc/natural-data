import { CloudEvent } from 'cloudevents';
import { GetSourceOptions, getSource } from './consts';
import { ErrorLoggingOptions, errorLoggingOptionsDefaults, logIfErrorAndReturn } from './errors';

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

interface ErrorData {
  error: Error;
  type: 'hypsibius.error';
};

export const getErrorCloudEvent = (
  e: string | Error,
  sourceOptions?: GetSourceOptions
): DefinedCloudEvent<ErrorData> => {
  return new CloudEvent({
    type: 'hypsibius.error',
    data: {
      error: typeof e === 'string' ? Error(e) : e,
      type: 'hypsibius.error'
    },
    source: getSource(sourceOptions)
  }) as DefinedCloudEvent<ErrorData>;
};

export const assertNotEmptyCloudEvent = <T, P, C>(
  callback: (context: C, cloudevent: DefinedCloudEvent<T>) => Promise<P>,
  options: AssertNotEmptyCloudEventOptions = AssertNotEmptyCloudEventOptionsDefaults
): ((context: C, cloudevent?: CloudEvent<T>) => Promise<DefinedCloudEvent<ErrorData> | P>) => {
  const calcOptions: Required<AssertNotEmptyCloudEventOptions> = {
    ...AssertNotEmptyCloudEventOptionsDefaults,
    ...options
  };
  return async (context: C, cloudevent?: CloudEvent<T>): Promise<DefinedCloudEvent<ErrorData> | P> => {
    if (!cloudevent || cloudevent.data === undefined || cloudevent.data === null) {
      return getErrorCloudEvent(calcOptions.message, calcOptions.sourceOptions);
    }
    return await asyncTryCatch(async () => await callback(context, cloudevent as DefinedCloudEvent<T>));
  };
};

type AssertNotEmptyCloudEventWithErrorLoggingOptions = AssertNotEmptyCloudEventOptions & ErrorLoggingOptions;

const assertNotEmptyCloudEventWithErrorLoggingOptionsDefaults = {
  ...AssertNotEmptyCloudEventOptionsDefaults,
  ...errorLoggingOptionsDefaults
};

export const assertNotEmptyCloudEventWithErrorLogging = <T, P, C>(
  callback: Parameters<typeof assertNotEmptyCloudEvent<T, P, C>>['0'],
  options: AssertNotEmptyCloudEventWithErrorLoggingOptions & {
    deferredLogger?: (
      ...args: Parameters<ReturnType<typeof assertNotEmptyCloudEvent<T, P, C>>>
    ) => NonNullable<ErrorLoggingOptions['logger']>;
  } = assertNotEmptyCloudEventWithErrorLoggingOptionsDefaults
): ReturnType<typeof assertNotEmptyCloudEvent<T, P, C>> => {
  const opts = {
    ...assertNotEmptyCloudEventWithErrorLoggingOptionsDefaults,
    ...options
  };
  const func = assertNotEmptyCloudEvent(callback, opts);
  return async (...args): ReturnType<typeof func> => {
    if (opts.deferredLogger) {
      opts.logger = opts.deferredLogger(...args);
    }
    return logIfErrorAndReturn(await func(...args), opts);
  };
};

export const tryCatch = <T = undefined>(
  callback: () => T,
  sourceOptions?: GetSourceOptions
): T | DefinedCloudEvent<ErrorData> => {
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
): Promise<R | DefinedCloudEvent<ErrorData>> => {
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
