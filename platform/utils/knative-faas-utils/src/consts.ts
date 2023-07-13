export interface GetSinkOptions {
  /**
   * K_SINK is the K8s address of the Knative SINK configured (through SinkBinding).
   * Use a direct value instead of getting from environment variables. */
  sink?: string | URL;
  /**
   * The environment variable name from which to extract the Sink address.
   * K_SINK is the K8s address of the Knative SINK configured (through SinkBinding).
   * Change default environment variable name. default: K_SINK */
  sink_env?: string;
}

export interface GetSourceOptions {
  /**
   * The value of the source attribute on the CloudEvent.
   * Use a direct value instead of getting from environment variables. */
  source?: string;
  /**
   * The environment variable name from which to extract the Source CloudEvent attribute.
   * K_REVISION is the name of the revision of the Knative function that is running.
   * Change default environment variable name. default: K_REVISION */
  source_env?: string;
}

export const getSink = (options?: GetSinkOptions): string | URL => {
  const sink: string | URL | undefined = options?.sink
    ? options.sink
    : options?.sink_env
    ? process.env[options.sink_env]
    : process.env.K_SINK;
  if (!sink) {
    throw Error('No K_SINK env');
  }
  return sink;
};

export const getSource = (options?: GetSourceOptions): string => {
  const source: string | undefined = options?.source
    ? options.source
    : options?.source_env
    ? process.env[options.source_env]
    : process.env.K_REVISION;

  if (!source) {
    throw Error('No K_REVISION env');
  }
  return source;
};
