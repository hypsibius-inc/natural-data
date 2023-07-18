import mongoose, { InferSchemaType, Schema, model } from 'mongoose';

export const UserSchema = new Schema({
  ids: {
    required: true,
    type: [
      {
        installation: {
          required: true,
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Installation'
        },
        teamOrgId: {
          required: true,
          type: String
        },
        userId: {
          required: true,
          type: String
        },
        isOrg: {
          required: true,
          type: Boolean,
          default: false
        }
      }
    ]
  },
  channels: {
    required: false,
    type: [
      {
        id: {
          type: String,
          required: true
        },
        o: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        }
      }
    ]
  }
});

export type User = InferSchemaType<typeof UserSchema>;

export const User = model('User', UserSchema);
