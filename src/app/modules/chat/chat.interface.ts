import { Types } from 'mongoose';

export interface IChat {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  message?: string;
  images?: {
    url: string;
    publicId: string;
  }[];
  deletedFor: Types.ObjectId[];
  isRead: boolean;
  groupId?: Types.ObjectId;
}
