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
import { User as SlackUser } from '@slack/web-api/dist/response/UsersInfoResponse';
import { Channel, User } from './mongo';
import { ArrayElement } from './utils';

export interface BaseHypsibiusEvent<T extends string = string> {
  type: T;
}

export interface ExtraHypsibiusEvent<X, E = Record<string, X>, T extends string = string>
  extends BaseHypsibiusEvent<T> {
  extra?: E;
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
  teamOrgId: string;
}
export interface SingleUserBaseRequest<T extends string> extends UserBaseRequest<T> {
  userId: string;
}
export interface ChannelBaseRequest<T extends string> extends MongoBaseRequest<'Channel', T> {
  teamId: string;
}
export interface ChannelFindRequest extends ChannelBaseRequest<'find'> {
  activeBot?: boolean;
  archived?: boolean;
  users?: string | string[];
  projection?: Record<string | keyof Channel, string | boolean | number>;
  population?: (string | keyof Channel)[];
}
export interface ChannelGetRequest extends ChannelBaseRequest<'get'> {
  channelId: string;
  projection?: Record<string | keyof Channel, string | boolean | number>;
  population?: (string | keyof Channel)[];
}
export interface UserGetRequest extends SingleUserBaseRequest<'get'> {
  projection?: Record<string | keyof User, string | boolean | number>;
  population?: (string | keyof User)[];
}
export interface UsersGetByChannelRequest extends SingleUserBaseRequest<'getByChannel'> {
  channelObjectId: string;
  projection?: Record<string | keyof User, string | boolean | number>;
  population?: (string | keyof User)[];
}
export type UserUpdateLabelsRequest = SingleUserBaseRequest<'update'> & {
  labels?: (Partial<Omit<ArrayElement<NonNullable<User['labels']>>, 'alertConfig' | 'id'>> & {
    id: string;
    alertConfig?: (Partial<ArrayElement<NonNullable<ArrayElement<NonNullable<User['labels']>>['alertConfig']>>> & {
      index: number;
    })[];
    deleteAlerts?: number[];
  })[];
  deleteLabelsById?: string[];
};
export type UserRequest = UserGetRequest | UserUpdateLabelsRequest | UsersGetByChannelRequest;
export type ChannelRequest = ChannelGetRequest | ChannelFindRequest;
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

export interface LabelledSlackMessage extends WebClientEvent<'hypsibius.slack.labelled_message'> {
  teamId: string;
  channelId: string;
  senderId: string;
  userId: string;
  ts: string;
  text: string;
  labels: Record<string, number>;
}

// export interface LabelTextRequest<X, E = Record<string, X>, C extends Classifiers = Classifiers>
//   extends ExtraHypsibiusEvent<X, E, 'hypsibius.ai.label_text'>,
//     TextClassificationRequest<C> {}

// export interface LabelTextResponse<X, E = Record<string, X>, C extends Classifiers = Classifiers>
//   extends ExtraHypsibiusEvent<X, E, 'hypsibius.ai.labelled_text'> {
//   request: LabelTextRequest<X, E, C>;
//   labels: Record<string, number>;
// }

export type HypsibiusEvent = // <X = unknown, E = Record<string, X>> =
    | ErrorEvent
    | SlackAppInstallationSuccess
    | SlackUserInstalledApp
    | SlackAppJoinedChannel
    | SlackAppLeftChannel
    | SlackSendMessage
    | SlackSendMessageResponse
    | HypsibiusSlackEvent
    | HypsibiusSlackBlockAction
    | LabelledSlackMessage;
// | LabelTextRequest<X, E>
// | LabelTextResponse<X, E>;

export type HypsibiusEventFromType<Type extends HypsibiusEvent['type']> = Extract<
  HypsibiusEvent,
  {
    type: Type;
  }
>;
