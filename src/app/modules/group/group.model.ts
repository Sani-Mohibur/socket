import { Schema, model } from 'mongoose';
import { IGroup } from './group.interface';

const groupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    groupImage: {
      url: { type: String },
      publicId: { type: String },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const Group = model<IGroup>('Group', groupSchema);
