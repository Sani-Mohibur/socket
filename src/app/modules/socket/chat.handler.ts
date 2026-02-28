import { Types } from 'mongoose';
import { Server } from 'socket.io';
import { User } from '../user/user.model';
import { Chat } from '../chat/chat.model';
import { fileDeleter } from '../../utils/deleteFile';

interface SendMessageData {
  receiverId: string;
  message?: string;
  images?: Array<{ url: string; publicId: string }>;
}

interface DeleteMessageData {
  messageId: string;
  deleteForEveryone: boolean; // True = remove from DB & Cloud; False = push to deletedFor
}

export const registerChatHandlers = (io: Server, socket: any) => {
  const userId = socket.user.id;

  socket.on('send-message', async (data: SendMessageData) => {
    try {
      const { receiverId, message, images } = data;

      if (!Types.ObjectId.isValid(receiverId)) {
        throw new Error('Invalid receiver ID format');
      }

      const receiverExists = await User.findById(receiverId);
      if (!receiverExists) {
        throw new Error('Receiver not found');
      }

      const newChat = await Chat.create({
        sender: userId,
        receiver: receiverId,
        message: message || '',
        images: images || [],
      });

      io.to(receiverId).to(userId).emit('receive-message', newChat);
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('get-chat-history', async (payload: { targetUserId: string }) => {
    try {
      const messages = await Chat.find({
        $and: [
          {
            $or: [
              { sender: socket.user.id, receiver: payload.targetUserId },
              { sender: payload.targetUserId, receiver: socket.user.id },
            ],
          },
          // Exclude messages deleted by the current user
          { deletedFor: { $ne: socket.user.id } },
        ],
      }).sort({ createdAt: 1 });

      socket.emit('chat-history', messages);
    } catch (err) {
      console.error('❌ Error fetching history:', err);
    }
  });

  socket.on('delete-message', async (data: DeleteMessageData) => {
    try {
      const { messageId, deleteForEveryone } = data;
      const message = await Chat.findById(messageId);

      if (!message) throw new Error('Message not found');

      if (deleteForEveryone && message.sender.toString() === socket.user.id) {
        // 1. Delete images from Cloudinary
        if (message.images && message.images.length > 0) {
          await Promise.all(
            message.images.map((img) =>
              fileDeleter.deleteFromCloudinary(img.publicId),
            ),
          );
        }
        // 2. Remove from DB
        await Chat.findByIdAndDelete(messageId);
      } else {
        // "Delete for me" only
        await Chat.findByIdAndUpdate(messageId, {
          $addToSet: { deletedFor: socket.user.id },
        });
      }

      // Emit confirmation to both parties to update UI
      io.to(socket.user.id)
        .to(message.receiver.toString())
        .emit('message-deleted', { messageId });
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on(
    'edit-message',
    async (data: { messageId: string; newMessage: string }) => {
      try {
        const { messageId, newMessage } = data;
        const message = await Chat.findById(messageId);

        if (!message) throw new Error('Message not found');
        if (message.sender.toString() !== socket.user.id)
          throw new Error('Unauthorized');

        // Check 15-minute time limit
        const timeElapsed =
          (Date.now() - new Date((message as any).createdAt).getTime()) / 60000;
        if (timeElapsed > 15) throw new Error('Edit time limit exceeded');

        // Update message
        const updatedMessage = await Chat.findByIdAndUpdate(
          messageId,
          { $set: { message: newMessage, isEdited: true } },
          { new: true },
        );

        // Notify both sender and receiver
        io.to(message.sender.toString())
          .to(message.receiver.toString())
          .emit('message-edited', updatedMessage);
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    },
  );
};
