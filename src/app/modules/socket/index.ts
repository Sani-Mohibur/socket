import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { jwtHelpers } from '../../helpers/jwtHelpers';
import config from '../../config';
import { registerChatHandlers } from './chat.handler';
import { registerUserHandlers } from './user.handler';
import { Group } from '../group/group.model';

const onlineUsers = new Map<string, string>();

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
    const token = socket.handshake.auth?.token || (authHeader && authHeader.split(' ')[1]);
    if (!token) return next(new Error('Authentication error: Token missing'));

    try {
      const decoded = jwtHelpers.verifyToken(token, config.jwt.access_secret as string);
      socket.user = decoded; // Attach user data to socket
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: any) => {
    const userId = socket.user.id;
    socket.join(userId);

    (async () => {
      try {
        const userGroups = await Group.find({ members: userId });
        userGroups.forEach((group) => {
          socket.join(group._id.toString());
        });
      } catch (err) {
        console.error('❌ Error joining group rooms:', err);
      }
    })();

    // Add to online map and broadcast status
    onlineUsers.set(userId, socket.id);
    io.emit('user-status-changed', { userId, status: 'online' });
    console.log(`🔌 User ${userId} joined, online count: ${onlineUsers.size}`);

    registerChatHandlers(io, socket);
    registerUserHandlers(io, socket);

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('user-status-changed', { userId, status: 'offline' });
      console.log(`❌ User ${userId} disconnected`);
    });
  });

  return io;
};
