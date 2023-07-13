import { Context, EventFromType } from '@slack/bolt';
import { ChatPostMessageArguments, ChatPostMessageResponse } from '@slack/web-api';

export interface HypsibiusSlackEvent<T extends string = string> {
  context: Context;
  payload: EventFromType<T>;
}
export interface SlackSendMessage {
  context: Context;
  args: ChatPostMessageArguments;
}
export interface SlackSendMessageResponse {
  context: Context;
  res: ChatPostMessageResponse;
}

export interface EventsToTypes {
  error: Error;
  slack_send_message: SlackSendMessage;
  slack_send_message_response: SlackSendMessageResponse;
}
