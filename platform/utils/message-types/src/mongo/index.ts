import mongoose from 'mongoose';

mongoose.Schema.Types.Array.checkRequired((v: any) => Array.isArray(v) && v.length > 0);

export * from './channel.schema';
export * from './installation-history.schema';
export * from './installation.schema';
export * from './user.schema';
