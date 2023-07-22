import { InferSchemaType, Schema, model } from 'mongoose';
import { InstallationHistory } from './installation-history.schema';

export const InstallationSchema = new Schema(
  {
    _id: {
      type: String,
      required: true
    },
    version: {
      type: Number,
      required: true
    },
    payload: {
      type: Object,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

async function pushToHistory(doc: Installation) {
  await InstallationHistory.create({
    slackId: doc._id,
    version: doc.version,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
    payload: doc.payload
  });
}

InstallationSchema.pre('findOneAndUpdate', function () {
  this.findOneAndUpdate({}, { $inc: { version: 1 } }, { new: true });
});

InstallationSchema.post('findOneAndUpdate', pushToHistory);

export type Installation = InferSchemaType<typeof InstallationSchema>;

export const Installation = model<Installation>('Installation', InstallationSchema);
