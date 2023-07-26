import { InferSchemaType, Schema, model } from 'mongoose';
import { User } from './user.schema';

export const ChannelSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      immutable: true
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
    name: {
      type: String,
      required: true
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
          localField: "users",
          foreignField: "ids.userId",
          match: (channel) => ({ids: {
            teamOrgId: channel.teamId,
            userId: {
              $in: channel.users
            }
          }})
        }
      }
    }
  }
);

export type Channel = InferSchemaType<typeof ChannelSchema> & {
  installedUsers: User[] | null;
};

export const Channel = model('Channel', ChannelSchema);
