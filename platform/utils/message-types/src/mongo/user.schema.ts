import mongoose, { InferSchemaType, Schema, model } from 'mongoose';

enum OnceIn {
  // Never waits, sends immediately
  Immediate = 'IMMEDIATE',
  // Rounds up to the nearest second
  Minutes = 'MINUTES',
  // Equivalent to 60 minutes
  Hours = 'HOURS',
  // Equivalent to 24 hours
  Days = 'DAYS',
  // Equivalent to 7 days
  Weeks = 'WEEKS',
  // Will use the startOn's dayOfMonth and timeOfDay, 28-31 days per month. No partial numbers allowed
  Months = 'MONTHS'
}

export const UserSchema = new Schema({
  email: {
    required: true,
    type: String,
    match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
  },
  ids: {
    required: true,
    type: [
      {
        _id: false,
        installation: {
          required: true,
          type: mongoose.Schema.Types.ObjectId,
          ref: 'InstallationHistory'
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
  labels: {
    required: true,
    type: [
      {
        id: {
          required: true,
          immutable: true,
          lowercase: true,
          type: String,
          default: function () {
            return ((this as any).name as string).replace(/\s/mg, '-'); // tslint: disable-line
          }
        },
        name: {
          required: true,
          type: String
        },
        description: String,
        alertConfig: {
          required: true,
          type: [
            {
              summarizeAbove: {
                required: true,
                type: Number,
                default: -1
              },
              onceInType: {
                required: true,
                type: String,
                enum: OnceIn,
                default: OnceIn.Immediate
              },
              onceInValue: {
                required: true,
                type: Number,
                default: 1
              },
              startOn: {
                required: true,
                type: Date,
                default: Date.now
              }
            }
          ],
          default: [{}]
        }
      }
    ],
    default: [
      { name: 'Urgent', description: 'Urgent, Immediate, Important, Crucial messages' },
      { name: 'Danger', description: 'Dangerous events - earthquakes, fires, collapse, shooting' },
      {
        name: 'Small talk',
        description: 'Small talk and chit-chat between coworkers, family, sports, pets, music, birthdays, parties',
        alertConfig: [{ onceInType: OnceIn.Hours, onceInValue: 2 }]
      },
      {
        name: 'Updates',
        description: 'Updates on completed work, new issues, work assignments',
        alertConfig: [
          { onceInType: OnceIn.Days, startOn: new Date(2023, 0, 1, 9) },
          {
            onceInType: OnceIn.Weeks,
            startOn: new Date(2023, 6, 17, 9), // 17th July (monthINDEX), Monday morning 09:00
            summarizeAbove: 1
          }
        ]
      }
    ]
  }
});

export type User = InferSchemaType<typeof UserSchema>;

export const User = model('User', UserSchema);
