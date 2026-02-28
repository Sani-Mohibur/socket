import { Schema, model } from 'mongoose';
import { IChat } from './chat.interface';

const chatSchema = new Schema<IChat>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, default: '' },
    images: [{ url: { type: String }, publicId: { type: String } }],
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

export const Chat = model<IChat>('Chat', chatSchema);
