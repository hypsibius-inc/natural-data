import { ConversationsInfoResponse } from '@slack/web-api';
import { Model, ObjectId, Schema, model } from 'mongoose';
import { User } from './user.schema';

export interface Channel {
  _id: ObjectId;
  id: string;
  name: string;
  info: Required<ConversationsInfoResponse>['channel'];
  teamId: string;
  activeBot: boolean;
  archived: boolean;
  users: string[];
  installedUsers: User[] | null;
}

export const ChannelSchema = new Schema<Channel>(
  {
    id: {
      type: String,
      required: true,
      immutable: true
    },
    name: {
      type: String,
      required: true
    },
    info: {
      type: Object,
      required: true
    },
    activeBot: {
      type: Boolean,
      required: true
    },
    archived: {
      type: Boolean,
      required: true,
      default: false
    },
    teamId: {
      type: String,
      required: true,
      immutable: true
    },
    users: {
      type: [String],
      required: true
    }
  },
  {
    toObject: { virtuals: true },
    virtuals: {
      installedUsers: {
        options: {
          ref: User,
          localField: 'users',
          foreignField: 'ids.userId',
          match: (channel: Channel) => ({
            ids: {
              teamOrgId: channel.teamId,
              userId: {
                $in: channel.users
              }
            },
            activeChannels: channel._id
          })
        }
      }
    }
  }
);

export const Channel: Model<Channel> = model<Channel>('Channel', ChannelSchema);
