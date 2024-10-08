/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublishFunction } from '@hypsibius/knative-faas-utils/build/publish';
import { HypsibiusEvent } from '@hypsibius/message-types';
import { App, Receiver, ReceiverEvent, ReceiverMultipleAckError } from '@slack/bolt';
import { StringIndexed } from '@slack/bolt/dist/types/helpers';
import { LogLevel, Logger } from '@slack/logger';
import { InstallProvider, InstallProviderOptions } from '@slack/oauth';
import crypto from 'crypto';
import { Context, StructuredReturn } from 'faas-js-runtime';
import { IncomingMessage, ServerResponse } from 'http';
import httpMocks from 'node-mocks-http';
import tsscmp from 'tsscmp';
import { success } from './install-success';
import { objectify } from './utils/objectify';

export interface FaaSJSReceiverOptions {
  signingSecret: string;
  logger: Logger;
  publish: PublishFunction<HypsibiusEvent>;
  installerOptions?: InstallProviderOptions;
  scopes?: string;
  logLevel?: LogLevel;
  customPropertiesExtractor?: (context: Context) => StringIndexed;
}

export type Handler = (context: Context, body?: string | StringIndexed) => Promise<StructuredReturn>;

export default class FaaSJSReceiver implements Receiver {
  private signingSecret: string;

  private app?: App;

  private logger: Logger;

  public installer?: InstallProvider;

  private scopes?: string;

  private customPropertiesExtractor: (context: Context) => StringIndexed;

  private publish: PublishFunction<HypsibiusEvent>;

  public constructor({
    signingSecret,
    logger,
    publish,
    installerOptions = undefined,
    scopes = undefined,
    customPropertiesExtractor = () => ({})
  }: FaaSJSReceiverOptions) {
    // Initialize instance variables, substituting defaults for each value
    this.signingSecret = signingSecret;
    this.logger = logger;
    this.publish = publish;
    this.customPropertiesExtractor = customPropertiesExtractor;
    if (installerOptions) {
      if (!scopes) {
        throw Error('Scopes must be provided with install provider options!');
      }
      this.installer = new InstallProvider({
        ...installerOptions,
        logger: this.logger
      });
      this.scopes = scopes;
    }
  }

  public init = (app: App): void => {
    this.app = app;
  };

  public start = (): Promise<Handler> => {
    return new Promise((resolve, reject) => {
      try {
        const handler = this.toHandler();
        resolve(handler);
      } catch (error) {
        reject(error);
      }
    });
  };

  public async handle(...args: Parameters<Handler>): ReturnType<Handler> {
    return await (
      await this.start()
    )(...args);
  }

  // eslint-disable-next-line class-methods-use-this
  public stop = (): Promise<void> => {
    return new Promise((resolve) => {
      resolve();
    });
  };

  private callWithReqRes = async <T>(
    callback: (req: IncomingMessage, res: ServerResponse) => Promise<T>,
    context: Context,
    body?: string | StringIndexed
  ): Promise<StructuredReturn> => {
    const url = new URL(`https://${context.headers.host}`);
    for (const [k, v] of Object.entries(context.query || {})) {
      url.searchParams.append(k, v);
    }
    const bd = body ? (typeof body === 'string' ? { body } : body) : {};
    const req = httpMocks.createRequest({
      url: url.href,
      headers: context.headers,
      body: bd
    });
    const res = httpMocks.createResponse({
      req: req
    });
    await callback(req, res);
    return {
      statusCode: res._getStatusCode(),
      headers: Object.fromEntries(
        Object.entries(res._getHeaders())
          .map(([k, v]): [string, string | undefined] => {
            if (Array.isArray(v)) {
              return [k, v.join(';')];
            }
            return [k, v];
          })
          .filter(([, v]) => v) as [string, string][]
      ),
      body: res._getData()
    };
  };

  public toHandler = (): Handler => {
    return async (context: Context, body?: string | StringIndexed): Promise<StructuredReturn> => {
      try {
        body = objectify(body);
        if (body && typeof body === 'object' && Object.keys(body).length === 1 && 'payload' in body) {
          body = body.payload;
        }
      } catch (e) {
        this.logger.error(`${e} Failed ${typeof e} to Objectify ${JSON.stringify(e)}`);
      }
      this.logger.debug(`FaaSJS Body: ${JSON.stringify(body)}`);

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

      // Empty get request (install)
      const scopes = this.scopes;
      if (
        (!body || Object.keys(body).length === 0 || body.length === 0) &&
        (!context.query || Object.keys(context.query).length === 0) &&
        this.installer !== undefined &&
        scopes
      ) {
        return await this.callWithReqRes(
          async (req, res) => {
            await this.installer?.handleInstallPath(req, res, undefined, { scopes });
          },
          context,
          body
        );
      }

      if (context.query && context.query.code && context.query.state && this.installer && this.scopes) {
        return await this.callWithReqRes(
          async (req, res) => {
            await this.installer?.handleCallback(
              req,
              res,
              {
                success: async (installation, ...args) => {
                  const id = installation.isEnterpriseInstall ? installation.enterprise?.id : installation.team?.id;
                  if (!id) {
                    throw Error(`No id provided`);
                  }
                  await this.publish({
                    data: {
                      type: 'hypsibius.slack.app_installation_success',
                      id: id,
                      payload: installation
                    }
                  });
                  success(installation, ...args);
                }
              },
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              { scopes: this.scopes! }
            );
          },
          context,
          body
        );
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

      if (!body) {
        throw Error(`No body`);
      }
      // Structure the ReceiverEvent
      let storedResponse: unknown;
      const event: ReceiverEvent = {
        body,
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
  };

  // eslint-disable-next-line class-methods-use-this
  private isValidRequestSignature = (
    signingSecret: string,
    body: string,
    signature: string,
    requestTimestamp: number
  ): boolean => {
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
  };

  // eslint-disable-next-line class-methods-use-this
  private getHeaderValue = (headers: Record<string, any>, key: string): string | undefined => {
    const caseInsensitiveKey = Object.keys(headers).find((it) => key.toLowerCase() === it.toLowerCase());
    return caseInsensitiveKey !== undefined ? headers[caseInsensitiveKey] : undefined;
  };
}
