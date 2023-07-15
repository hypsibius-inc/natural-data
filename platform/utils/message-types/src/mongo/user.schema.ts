import { Schema, model } from 'mongoose';

export const UserSchema = new Schema({});

export const User = model('User', UserSchema);
