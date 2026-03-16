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
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
      },
    ],
    replyTo: { type: Schema.Types.ObjectId, ref: 'Chat', default: null },
    isEdited: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

export const Chat = model<IChat>('Chat', chatSchema);
