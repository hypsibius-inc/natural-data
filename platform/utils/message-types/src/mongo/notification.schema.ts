import mongoose, { Model, ObjectId, Schema, model } from 'mongoose';
import { User } from './user.schema';

export interface Notification {
  _id: ObjectId;
  scheduledMessageId: string | undefined;
  user: User | ObjectId;
  labelId: string;
  alertIndex: number;
  channels: {
    channel: string;
    authors: {
      author: string;
      messages: string[];
    }[];
  }[];
}

export const NotificationSchema = new Schema<Notification>({
  scheduledMessageId: String,
  user: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: User
  },
  alertIndex: {
    required: true,
    type: Number
  },
  labelId: {
    required: true,
    type: String
  },
  channels: {
    required: true,
    type: [
      {
        _id: false,
        channel: {
          required: true,
          type: String
        },
        authors: {
          required: true,
          type: [
            {
              _id: false,
              author: String,
              messages: {
                required: true,
                type: [String]
              }
            }
          ]
        }
      }
    ]
  }
});

export const Notification: Model<Notification> = model<Notification>(
  'Notification',
  NotificationSchema
);
