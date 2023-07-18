import mongoose from 'mongoose';

export * from './installation.schema';
export * from './user.schema';

mongoose.Schema.Types.Array.checkRequired((v: any) => Array.isArray(v) && v.length > 0);
