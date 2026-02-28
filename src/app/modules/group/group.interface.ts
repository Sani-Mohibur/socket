import { Types, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  members: Types.ObjectId[];
  admins: Types.ObjectId[];
  groupImage?: { url: string; publicId: string };
  createdBy: Types.ObjectId;
}
