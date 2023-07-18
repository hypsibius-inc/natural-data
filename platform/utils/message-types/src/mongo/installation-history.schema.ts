import { InferSchemaType, Schema, model } from 'mongoose';

export const InstallationHistorySchema = new Schema(
  {
    slackId: {
      type: String,
      required: true,
      immutable: true,
    },
    version: {
      type: Number,
      required: true
    },
    payload: {
      type: Object,
      required: true
    },
    createdAt: {
      type: Date,
      required: true
    },
    updatedAt: {
      type: Date,
      required: true
    }
  },
  {
    versionKey: false
  }
);

export type InstallationHistory = InferSchemaType<typeof InstallationHistorySchema>;

export const InstallationHistory = model<InstallationHistory>('InstallationHistory', InstallationHistorySchema);
