import { Installation, BasicElementAction, BlockAction, BlockElementAction, Context, EventFromType, SlackEvent } from '@slack/bolt';
import { ChatPostMessageArguments, ChatPostMessageResponse, WebClientOptions } from '@slack/web-api';
import { User as SlackUser } from '@slack/web-api/dist/response/UsersInfoResponse';
import { Channel, User } from './mongo';
import { ArrayElement } from './utils';

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
export interface MongoBaseRequest<S extends string, T extends string> {
  schema: S;
  type: T;
}
export interface UserBaseRequest<T extends string> extends MongoBaseRequest<'User', T> {
  userId: string;
  teamOrgId: string;
}
export interface ChannelBaseRequest<T extends string> extends MongoBaseRequest<'Channel', T> {
  teamId: string;
  activeBot?: boolean;
  archived?: boolean;
  users?: string | string[];
}
export interface ChannelGetRequest extends ChannelBaseRequest<'get'> {
  projection?: Record<string | keyof Channel, string | boolean | number>;
  population?: (string | keyof Channel)[];
}
export interface UserGetRequest extends UserBaseRequest<'get'> {
  projection?: Record<string | keyof User, string | boolean | number>;
  population?: (string | keyof User)[];
}
export type UserUpdateLabelsRequest = UserBaseRequest<'update'> & {
  labels?: (Partial<Omit<ArrayElement<NonNullable<User['labels']>>, 'alertConfig' | 'id'>> & {
    id: string;
    alertConfig?: (Partial<ArrayElement<NonNullable<ArrayElement<NonNullable<User['labels']>>['alertConfig']>>> & {
      index: number;
    })[];
    deleteAlerts?: number[];
  })[];
  deleteLabelsById?: string[];
};
export type UserRequest = UserGetRequest | UserUpdateLabelsRequest;
export type ChannelRequest = ChannelGetRequest;
export type MongoRequest = UserRequest | ChannelRequest;
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
  user: SlackUser;
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
