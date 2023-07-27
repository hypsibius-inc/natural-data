import { Context, EventFromType, Installation, SlackEvent } from '@slack/bolt';
import { ChatPostMessageArguments, ChatPostMessageResponse, WebClientOptions } from '@slack/web-api';
import { Profile } from '@slack/web-api/dist/response/UsersProfileGetResponse';

export interface WebClientParams {
  token: string;
  options?: WebClientOptions;
}

export interface WebClientEvent {
  webClientParams: WebClientParams;
}

export interface HypsibiusSlackEvent<T extends string = string> {
  context: Context;
  payload: EventFromType<T>;
}
export interface SlackSendMessage extends WebClientEvent {
  args: ChatPostMessageArguments;
}
export interface SlackSendMessageResponse extends WebClientEvent {
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
export type SlackAppInstallationSuccess = {
  id: string;
  payload: Installation;
};
export type SlackUserInstalledApp = {
  profile: Profile;
  installationId: string;
  installation: Installation;
};
export type SlackAppJoinedChannel = {
  teamId: string;
  channelId: string;
  inviter?: string;
  members: string[];
};
export type SlackAppLeftChannel = {
  teamId: string;
  channelId: string;
  remover?: string;
  members: string[];
};

export interface EventsToTypes {
  error: Error;
  slack_app_installation_success: SlackAppInstallationSuccess;
  slack_user_installed_app: SlackUserInstalledApp;
  slack_app_joined_channel: SlackAppJoinedChannel;
  slack_app_left_channel: SlackAppLeftChannel;
  slack_send_message: SlackSendMessage;
  slack_send_message_response: SlackSendMessageResponse;
}

export type SlackEventsToTypes = {
  [t in SlackEvent['type'] | string]: HypsibiusSlackEvent<t>;
};
