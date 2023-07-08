/* eslint-disable @typescript-eslint/no-explicit-any */
import { Context, StructuredReturn } from '@hypsibius/faas-js-runtime';
import { App, Receiver, ReceiverEvent, ReceiverMultipleAckError } from '@slack/bolt';
import { StringIndexed } from '@slack/bolt/dist/types/helpers';
import { ConsoleLogger, LogLevel, Logger } from '@slack/logger';
import crypto from 'crypto';
import tsscmp from 'tsscmp';

export interface FaaSJSReceiverOptions {
  signingSecret: string;
  logger?: Logger;
  logLevel?: LogLevel;
  customPropertiesExtractor?: (context: Context) => StringIndexed;
}

export type Handler = (context: Context, body?: string | StringIndexed) => Promise<StructuredReturn>;

/*
 * Receiver implementation for FaaS JS runtime
 *
 * Note that this receiver does not support Slack OAuth flow.
 * For OAuth flow endpoints, deploy another Lambda function built with ExpressReceiver.
 */
export default class FaaSJSReceiver implements Receiver {
  private signingSecret: string;

  private app?: App;

  private logger: Logger;

  private customPropertiesExtractor: (context: Context) => StringIndexed;

  public constructor({
    signingSecret,
    logger = undefined,
    logLevel = LogLevel.INFO,
    customPropertiesExtractor = (_) => ({})
  }: FaaSJSReceiverOptions) {
    // Initialize instance variables, substituting defaults for each value
    this.signingSecret = signingSecret;
    this.logger =
      logger ??
      (() => {
        const defaultLogger = new ConsoleLogger();
        defaultLogger.setLevel(logLevel);
        return defaultLogger;
      })();
    this.customPropertiesExtractor = customPropertiesExtractor;
  }

  public init(app: App): void {
    this.app = app;
  }

  public start(..._args: any[]): Promise<Handler> {
    return new Promise((resolve, reject) => {
      try {
        const handler = this.toHandler();
        resolve(handler);
      } catch (error) {
        reject(error);
      }
    });
  }

  // eslint-disable-next-line class-methods-use-this
  public stop(..._args: any[]): Promise<void> {
    return new Promise((resolve, _reject) => {
      resolve();
    });
  }

  public toHandler(): Handler {
    return async (context: Context, body?: string | StringIndexed): Promise<StructuredReturn> => {
      this.logger.debug(`FaaSJS Event: ${JSON.stringify(context, null, 2)}`);

      // ssl_check (for Slash Commands)
      if (
        typeof body !== 'undefined' &&
        typeof body !== 'string' &&
        body != null &&
        typeof body.ssl_check !== 'undefined' &&
        body.ssl_check != null
      ) {
        return Promise.resolve({ statusCode: 200, body: '' });
      }

      // request signature verification
      const signature = this.getHeaderValue(context.headers, 'X-Slack-Signature') as string;
      const ts = Number(this.getHeaderValue(context.headers, 'X-Slack-Request-Timestamp'));
      if (!this.isValidRequestSignature(this.signingSecret, context.rawBody || '', signature, ts)) {
        this.logger.info(
          `Invalid request signature detected (X-Slack-Signature: ${signature}, X-Slack-Request-Timestamp: ${ts})`
        );
        return Promise.resolve({ statusCode: 401, body: '' });
      }

      // url_verification (Events API)
      if (
        typeof body !== 'undefined' &&
        typeof body !== 'string' &&
        body != null &&
        typeof body.type !== 'undefined' &&
        body.type != null &&
        body.type === 'url_verification'
      ) {
        return Promise.resolve({
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challenge: body.challenge })
        });
      }

      // Setup ack timeout warning
      let isAcknowledged = false;
      const noAckTimeoutId = setTimeout(() => {
        if (!isAcknowledged) {
          this.logger.error(
            'An incoming event was not acknowledged within 3 seconds. ' +
              'Ensure that the ack() argument is called in a listener.'
          );
        }
      }, 3001);

      // Body type verification
      if (typeof body !== 'undefined' && typeof body === 'string' && body != null) {
        return Promise.resolve({
          statusCode: 422,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Bad payload' })
        });
      }

      // Structure the ReceiverEvent
      let storedResponse;
      const event: ReceiverEvent = {
        body: body!,
        ack: async (response) => {
          if (isAcknowledged) {
            throw new ReceiverMultipleAckError();
          }
          isAcknowledged = true;
          clearTimeout(noAckTimeoutId);
          if (typeof response === 'undefined' || response == null) {
            storedResponse = '';
          } else {
            storedResponse = response;
          }
        },
        retryNum: this.getHeaderValue(context.headers, 'X-Slack-Retry-Num') as number | undefined,
        retryReason: this.getHeaderValue(context.headers, 'X-Slack-Retry-Reason'),
        customProperties: this.customPropertiesExtractor(context)
      };

      // Send the event to the app for processing
      try {
        await this.app?.processEvent(event);
        if (storedResponse !== undefined) {
          if (typeof storedResponse === 'string') {
            return { statusCode: 200, body: storedResponse };
          }
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(storedResponse)
          };
        }
      } catch (err) {
        this.logger.error('An unhandled error occurred while Bolt processed an event');
        this.logger.debug(`Error details: ${err}, storedResponse: ${storedResponse}`);
        return { statusCode: 500, body: 'Internal server error' };
      }
      this.logger.info(`No request handler matched the request: ${context.req.url}`);
      return { statusCode: 404, body: '' };
    };
  }

  // eslint-disable-next-line class-methods-use-this
  private isValidRequestSignature(
    signingSecret: string,
    body: string,
    signature: string,
    requestTimestamp: number
  ): boolean {
    if (!signature || !requestTimestamp) {
      return false;
    }

    // Divide current date to match Slack ts format
    // Subtract 5 minutes from current time
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
    if (requestTimestamp < fiveMinutesAgo) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', signingSecret);
    const [version, hash] = signature.split('=');
    hmac.update(`${version}:${requestTimestamp}:${body}`);
    if (!tsscmp(hash, hmac.digest('hex'))) {
      return false;
    }

    return true;
  }

  // eslint-disable-next-line class-methods-use-this
  private getHeaderValue(headers: Record<string, any>, key: string): string | undefined {
    const caseInsensitiveKey = Object.keys(headers).find((it) => key.toLowerCase() === it.toLowerCase());
    return caseInsensitiveKey !== undefined ? headers[caseInsensitiveKey] : undefined;
  }
}
