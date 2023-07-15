import { InferSchemaType, Schema, model } from 'mongoose';

export const InstallationSchema = new Schema({
  slackId: {
    type: String,
    required: true
  },
  payload: {
    type: Object,
    required: true
  }
});

export type Installation = InferSchemaType<typeof InstallationSchema>;

export const Installation = model<Installation>('Installation', InstallationSchema);
