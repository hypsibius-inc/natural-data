import {
  BasicElementAction,
  BlockAction,
  BlockElementAction,
  Context,
  EventFromType,
  Installation,
  SlackEvent
} from '@slack/bolt';
import { ChatPostMessageArguments, ChatPostMessageResponse, WebClientOptions } from '@slack/web-api';
import { Profile } from '@slack/web-api/dist/response/UsersProfileGetResponse';

export interface BaseHypsibiusEvent<T extends string = string> {
  type: T;
}

export interface ErrorEvent extends BaseHypsibiusEvent<'hypsibius.error'> {
  error: Error;
}

export interface WebClientParams {
  token: string;
  options?: WebClientOptions;
}

export interface WebClientEvent<T extends string> extends BaseHypsibiusEvent<T> {
  webClientParams: WebClientParams;
}

export interface HypsibiusSlackEvent<T extends SlackEvent['type'] = SlackEvent['type']>
  extends BaseHypsibiusEvent<`slack.event.${T}`> {
  context: Context;
  payload: EventFromType<T>;
}
export type ActionFromType<T extends string> = KnownActionFromType<T> extends never
  ? BasicElementAction<T>
  : KnownActionFromType<T>;
export type KnownActionFromType<T extends string> = Extract<
  BlockElementAction,
  {
    type: T;
  }
>;
export interface HypsibiusSlackBlockAction<T extends BlockElementAction['type'] = BlockElementAction['type']>
  extends BaseHypsibiusEvent<`slack.blockAction.${T}`> {
  context: Context;
  payload: ActionFromType<T>;
  body: Omit<BlockAction<this['payload']>, 'actions'>;
}
export interface SlackSendMessage extends WebClientEvent<'hypsibius.slack.send_message'> {
  args: ChatPostMessageArguments;
}
export interface SlackSendMessageResponse extends WebClientEvent<'hypsibius.slack.send_message_response'> {
  res: ChatPostMessageResponse;
}
export type InstallationRequest = {
  id: string;
} & (
  | {
      type: 'set';
      payload: Installation;
    }
  | {
      type: 'get' | 'delete';
    }
);
export interface SlackAppInstallationSuccess extends BaseHypsibiusEvent<'hypsibius.slack.app_installation_success'> {
  id: string;
  payload: Installation;
}
export interface SlackUserInstalledApp extends BaseHypsibiusEvent<'hypsibius.slack.user_installed_app'> {
  profile: Profile;
  installationId: string;
  installation: Installation;
}
export interface SlackAppJoinedChannel extends BaseHypsibiusEvent<'hypsibius.slack.app_joined_channel'> {
  teamId: string;
  channelId: string;
  inviter?: string;
  members: string[];
}
export interface SlackAppLeftChannel extends BaseHypsibiusEvent<'hypsibius.slack.app_left_channel'> {
  teamId: string;
  channelId: string;
  remover?: string;
  members: string[];
}

export type HypsibiusEvent =
  | ErrorEvent
  | SlackAppInstallationSuccess
  | SlackUserInstalledApp
  | SlackAppJoinedChannel
  | SlackAppLeftChannel
  | SlackSendMessage
  | SlackSendMessageResponse
  | HypsibiusSlackEvent
  | HypsibiusSlackBlockAction;

export type HypsibiusEventFromType<Type extends HypsibiusEvent['type']> = Extract<
  HypsibiusEvent,
  {
    type: Type;
  }
>;
