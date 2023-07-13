import { AppHomeOpenedEvent } from '@slack/bolt';
import { ChatPostMessageArguments, ChatPostMessageResponse } from '@slack/web-api';

export type SlackSendMessage = ChatPostMessageArguments;
export type AppHomeOpened = AppHomeOpenedEvent;
export type SlackSendMessageResponse = ChatPostMessageResponse;

export interface EventsToTypes {
  error: Error;
  app_home_opened: AppHomeOpened;
  slack_send_message: SlackSendMessage;
  slack_send_message_response: SlackSendMessageResponse;
}
