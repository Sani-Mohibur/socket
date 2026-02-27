import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { jwtHelpers } from '../../helpers/jwtHelpers';
import config from '../../config';
import { Chat } from '../chat/chat.model';
import { Types } from 'mongoose';
import { User } from '../user/user.model';

interface SendMessageData {
  receiverId: string;
  message?: string;
  images?: Array<{ url: string; publicId: string }>;
}

export const initSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Authentication Middleware
  io.use((socket: any, next) => {
    const authHeader = socket.handshake.headers?.authorization;
    const token =
      socket.handshake.auth?.token || (authHeader && authHeader.split(' ')[1]);
    if (!token) return next(new Error('Authentication error: Token missing'));

    try {
      const decoded = jwtHelpers.verifyToken(
        token,
        config.jwt.access_secret as string,
      );
      socket.user = decoded; // Attach user data to socket
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: any) => {
    const userId = socket.user.id;
    socket.join(userId);
    console.log(`🔌 User ${userId} joined their own room`);

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
          $or: [
            { sender: socket.user.id, receiver: payload.targetUserId },
            { sender: payload.targetUserId, receiver: socket.user.id },
          ],
        }).sort({ createdAt: 1 });

        // Send history back only to the requester
        socket.emit('chat-history', messages);
      } catch (err) {
        console.error('❌ Error fetching history:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ User disconnected');
    });
  });

  return io;
};
