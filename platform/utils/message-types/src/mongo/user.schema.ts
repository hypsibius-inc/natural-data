import { User as SlackUser } from '@slack/web-api/dist/response/UsersInfoResponse';
import mongoose, { Model, ObjectId, Schema, model } from 'mongoose';
import { ArrayElement } from '../utils';
import { Channel } from './channel.schema';
import { InstallationHistory } from './installation-history.schema';

export enum OnceIn {
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

export const fillDefaultAlert = (
  a: Partial<ArrayElement<NonNullable<ArrayElement<NonNullable<User['labels']>>['alertConfig']>>>
): ArrayElement<NonNullable<ArrayElement<NonNullable<User['labels']>>['alertConfig']>> => ({
  onceInType: a.onceInType ?? OnceIn.Immediate,
  onceInValue: a.onceInValue ?? 1,
  summarizeAbove: a.summarizeAbove ?? -1,
  startOn: a.startOn ?? new Date()
});

export interface User {
  email: string;
  info: SlackUser;
  ids: {
    installation: ObjectId | InstallationHistory;
    teamOrgId: string;
    userId: string;
    isOrg: boolean;
  }[];
  labels?: {
    id: string;
    name: string;
    description?: string;
    alertConfig?: {
      summarizeAbove: number;
      onceInType: OnceIn;
      onceInValue: number;
      startOn: Date;
    }[];
  }[];
  activeChannels: ObjectId[] | Channel[];
}

export const UserSchema = new Schema<User>(
  {
    email: {
      required: true,
      type: String,
      match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
    },
    info: Object,
    ids: {
      required: true,
      type: [
        {
          _id: false,
          installation: {
            required: true,
            type: mongoose.Schema.Types.ObjectId,
            ref: InstallationHistory
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
          _id: false,
          name: {
            required: true,
            type: String
          },
          id: {
            required: true,
            lowercase: true,
            type: String,
            default: function () {
              return ((this as any).name as string).toLowerCase().replace(/[\s\n\t\.]/gm, '-');
            }
          },
          description: String,
          alertConfig: {
            type: [
              {
                _id: false,
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
        { id: 'urgent', name: 'Urgent', description: 'Urgent, Immediate, Important, Crucial messages' },
        { id: 'danger', name: 'Danger', description: 'Dangerous events - earthquakes, fires, collapse, shooting' },
        {
          id: 'small-talk',
          name: 'Small talk',
          description: 'Small talk and chit-chat between coworkers, family, sports, pets, music, birthdays, parties',
          alertConfig: [{ onceInType: OnceIn.Hours, onceInValue: 2 }]
        },
        {
          id: 'updates',
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
    },
    activeChannels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel'
      }
    ]
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const User: Model<User> = model<User>('User', UserSchema);
