import { Server } from 'socket.io';
import { Chat } from '../chat/chat.model';
import { Types } from 'mongoose';

export const registerUserHandlers = (io: Server, socket: any) => {
  socket.on('typing', (data: { receiverId: string }) => {
    socket
      .to(data.receiverId)
      .emit('user-typing', { senderId: socket.user.id });
  });

  socket.on('stop-typing', (data: { receiverId: string }) => {
    socket
      .to(data.receiverId)
      .emit('user-stop-typing', { senderId: socket.user.id });
  });

  socket.on('mark-as-read', async (data: { senderId: string }) => {
    try {
      const { senderId } = data;

      // 1. Update all unread messages from this sender to the current user as read
      const result = await Chat.updateMany(
        { sender: senderId, receiver: socket.user.id, isRead: false },
        { $set: { isRead: true } },
      );

      // 2. Only emit if messages were actually updated
      if (result.modifiedCount > 0) {
        // Notify the sender that their messages have been read
        io.to(senderId).emit('messages-marked-read', {
          readerId: socket.user.id,
        });
      }
    } catch (err) {
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  });

  socket.on('get-unread-counts', async () => {
    try {
      const unreadCounts = await Chat.aggregate([
        {
          $match: {
            receiver: new Types.ObjectId(socket.user.id),
            isRead: false,
          },
        },
        {
          $group: {
            _id: '$sender',
            count: { $sum: 1 },
          },
        },
      ]);

      // Emit the list of { senderId, count } to the client
      socket.emit('unread-counts', unreadCounts);
    } catch (err) {
      console.error('❌ Error fetching unread counts:', err);
    }
  });
};
