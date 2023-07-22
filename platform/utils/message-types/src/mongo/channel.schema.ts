import mongoose, { InferSchemaType, Schema, model } from 'mongoose';

export const ChannelSchema = new Schema({
  id: {
    type: String,
    required: true,
    immutable: true
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
  installedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  users: {
    type: [String],
    required: true
  }
});

export type Channel = InferSchemaType<typeof ChannelSchema>;

export const Channel = model('Channel', ChannelSchema);
