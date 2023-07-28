import { CloudEvent } from 'cloudevents';

export interface ErrorLoggingOptions {
  errorType?: string;
  statusCodeProperty?: string;
  messageProperty?: string;
  minStatusCode?: number;
  logger?: {
    error: (message: string) => void
  };
}

export const errorLoggingOptionsDefaults: Required<ErrorLoggingOptions> = {
  errorType: 'error',
  statusCodeProperty: 'statusCode',
  messageProperty: 'body',
  minStatusCode: 400,
  logger: console,
};

export const logIfErrorAndReturn = <T>(
  result: T,
  options: ErrorLoggingOptions = errorLoggingOptionsDefaults
): T => {
  const opts: Required<ErrorLoggingOptions> = {
    ...errorLoggingOptionsDefaults,
    ...options
  };
  if (result instanceof CloudEvent && (result.data instanceof Error || result.type === options.errorType)) {
    opts.logger.error(JSON.stringify(result));
  } else if (
    result &&
    typeof result === 'object' &&
    typeof result[opts.statusCodeProperty] in ['string', 'number'] &&
    parseInt(result[opts.statusCodeProperty]) >= opts.minStatusCode
  ) {
    opts.logger.error(JSON.stringify(result[opts.messageProperty]))
  }
  return result;
};
