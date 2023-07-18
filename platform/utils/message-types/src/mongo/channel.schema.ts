import mongoose, { InferSchemaType, Schema, model } from 'mongoose';

export const ChannelSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    }
  ]
});

export type Channel = InferSchemaType<typeof ChannelSchema>;

export const Channel = model('Channel', ChannelSchema);
