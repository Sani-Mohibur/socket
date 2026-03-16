import { Types } from 'mongoose';
import { Server } from 'socket.io';
import { User } from '../user/user.model';
import { Chat } from '../chat/chat.model';
import { fileDeleter } from '../../utils/deleteFile';
import { Group } from '../group/group.model';
import { paginationHelper } from '../../helpers/paginationHelper';
import pick from '../../utils/pick';
import QueryBuilder from '../../builder/QueryBuilder';

interface SendMessageData {
  receiverId?: string;
  groupId?: string;
  message?: string;
  images?: Array<{ url: string; publicId: string }>;
  replyTo?: string;
}

interface DeleteMessageData {
  messageId: string;
  deleteForEveryone: boolean; // True = remove from DB & Cloud; False = push to deletedFor
}

export const registerChatHandlers = (io: Server, socket: any) => {
  const userId = socket.user.id;

  socket.on('send-message', async (data: SendMessageData & { groupId?: string }) => {
    try {
      const { receiverId, groupId, message, images, replyTo } = data;

      // 1. Validation Logic
      if (groupId) {
        // Logic for Group Message
        const groupExists = await Group.findById(groupId);
        if (!groupExists) throw new Error('Group not found');
      } else if (receiverId) {
        // Logic for Private Message
        if (!Types.ObjectId.isValid(receiverId)) throw new Error('Invalid receiver ID');
        const receiverExists = await User.findById(receiverId);
        if (!receiverExists) throw new Error('Receiver not found');
      } else {
        throw new Error('Either receiverId or groupId is required');
      }

      // 2. Create the message
      const chatData: any = {
        sender: userId,
        receiver: receiverId ? new Types.ObjectId(receiverId) : null,
        message: message || '',
        images: images || [],
        groupId: groupId ? new Types.ObjectId(groupId) : null,
        replyTo: replyTo ? new Types.ObjectId(replyTo) : null,
      };

      if (groupId) {
        chatData.groupId = new Types.ObjectId(groupId);
      }

      const newChat = await Chat.create(chatData);

      // 3. Conditional Routing
      if (groupId) {
        // Broadcast to all group members via the group room
        io.to(groupId).emit('receive-message', newChat);
      } else if (receiverId) {
        // Private message to specific users
        io.to(receiverId).emit('receive-message', newChat);
      }
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
            message.images.map((img) => fileDeleter.deleteFromCloudinary(img.publicId)),
          );
        }
        // 2. Remove from DB
        await Chat.findByIdAndDelete(messageId);

        // 3. Broadcast to BOTH parties for everyone-deletion
        io.to(socket.user.id)
          .to(message.receiver.toString())
          .emit('message-deleted', { messageId });
      } else {
        // "Delete for me" only
        await Chat.findByIdAndUpdate(messageId, {
          $addToSet: { deletedFor: socket.user.id },
        });

        // 4. Emit ONLY to the sender for private-deletion
        socket.emit('message-deleted', { messageId });
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('edit-message', async (data: { messageId: string; newMessage: string }) => {
    try {
      const { messageId, newMessage } = data;
      const message = await Chat.findById(messageId);

      if (!message) throw new Error('Message not found');
      if (message.sender.toString() !== socket.user.id) throw new Error('Unauthorized');

      // Check 15-minute time limit
      const timeElapsed = (Date.now() - new Date((message as any).createdAt).getTime()) / 60000;
      if (timeElapsed > 15) throw new Error('Edit time limit exceeded');

      // Update message
      const updatedMessage = await Chat.findByIdAndUpdate(
        messageId,
        { $set: { message: newMessage, isEdited: true } },
        { returnDocument: 'after' },
      );

      // Notify both sender and receiver
      io.to(message.sender.toString())
        .to(message.receiver.toString())
        .emit('message-edited', updatedMessage);
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('react-to-message', async (data: { messageId: string; emoji: string }) => {
    try {
      const { messageId, emoji } = data;

      const updatedChat = await Chat.findByIdAndUpdate(
        messageId,
        { $push: { reactions: { userId: socket.user.id, emoji } } },
        { new: true },
      );

      if (!updatedChat) throw new Error('Message not found');

      // Unified Routing
      // Check if it's a group or private message using the updated document
      if (updatedChat.groupId) {
        io.to(updatedChat.groupId.toString()).emit('message-reacted', {
          messageId,
          reactions: updatedChat.reactions,
        });
      } else if (updatedChat.receiver) {
        io.to(updatedChat.receiver.toString())
          .to(updatedChat.sender.toString())
          .emit('message-reacted', {
            messageId,
            reactions: updatedChat.reactions,
          });
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('create-group', async (data: { name: string; members: string[] }) => {
    try {
      const { name, members } = data;

      // Create the group
      const newGroup = await Group.create({
        name,
        members: [...members, userId], // Add creator to members
        admins: [userId],
        createdBy: userId,
      });

      // Notify members to join the room
      members.forEach((memberId) => {
        io.to(memberId).emit('added-to-group', { groupId: newGroup._id });
      });

      // Creator joins their own room
      socket.join(newGroup._id.toString());

      socket.emit('group-created', newGroup);
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('get-my-groups', async () => {
    try {
      const myGroups = await Group.find({ members: socket.user.id });
      socket.emit('my-groups', myGroups);
    } catch (error: any) {
      socket.emit('error', { message: 'Failed to fetch groups' });
    }
  });

  socket.on('leave-group', async (data: { groupId: string }) => {
    try {
      const { groupId } = data;

      // 1. Remove user from members list
      const updatedGroup = await Group.findByIdAndUpdate(
        groupId,
        { $pull: { members: socket.user.id } },
        { new: true },
      );

      if (!updatedGroup) throw new Error('Group not found');

      // 2. Remove user from the room
      socket.leave(groupId);

      // 3. Notify the group (optional)
      io.to(groupId).emit('user-left-group', {
        groupId,
        userId: socket.user.id,
      });

      socket.emit('left-group', { groupId });
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  // prettier-ignore
  socket.on('get-media-gallery', async (payload: {
      groupId?: string;
      receiverId?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }) => {
      try {
        const { groupId, receiverId } = payload;
        const paginationOptions = pick(payload, ['page', 'limit', 'sortBy', 'sortOrder']);
        const { limit, skip, sortBy, sortOrder } =
          paginationHelper.calculatePagination(paginationOptions);

        const query: any = {
          images: { $exists: true, $ne: [] },
        };

        if (groupId) {
          query.groupId = new Types.ObjectId(groupId);
        } else if (receiverId) {
          query.$or = [
            { sender: userId, receiver: receiverId },
            { sender: receiverId, receiver: userId },
          ];
        } else {
          throw new Error('Either groupId or receiverId is required');
        }

        const mediaMessages = await Chat.find(query)
          .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limit);

        socket.emit('media-gallery', mediaMessages);
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    },
  );

  socket.on('pin-message', async (data: { messageId: string }) => {
    try {
      const { messageId } = data;
      const message = await Chat.findById(messageId);

      if (!message) throw new Error('Message not found');

      // Toggle the pin status
      const newPinnedStatus = !message.isPinned;

      const updatedMessage = await Chat.findByIdAndUpdate(
        messageId,
        { $set: { isPinned: newPinnedStatus } },
        { new: true },
      );

      // Broadcast the update to the relevant room
      const targetRoom = message.groupId
        ? message.groupId.toString()
        : [message.sender.toString(), message.receiver.toString()].sort().join('_');

      io.to(targetRoom).emit('message-pinned', {
        messageId,
        isPinned: newPinnedStatus,
      });
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  // prettier-ignore
  socket.on('search-messages', async (payload: { 
    searchTerm: string; page?: number; limit?: number }) => {
      try {
        const userId = new Types.ObjectId(socket.user.id);

        // 1. Get IDs of all groups the user is a member of
        const userGroups = await Group.find({ members: userId }).select('_id');
        const groupIds = userGroups.map((g) => g._id);

        // 2. Base query: restrict to conversations user is part of
        const baseQuery = {
          $or: [{ sender: userId }, { receiver: userId }, { groupId: { $in: groupIds } }],
        };

        // 3. Initialize QueryBuilder with base filter
        const chatQuery = new QueryBuilder(Chat.find(baseQuery), payload)
          .search(['message']) // searchable field
          .sort()
          .paginate();

        const results = await chatQuery.modelQuery;
        socket.emit('search-results', results);
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    },
  );

  socket.on(
    'toggle-admin',
    async (data: { groupId: string; targetUserId: string; action: 'promote' | 'demote' }) => {
      try {
        const { groupId, targetUserId, action } = data;
        const group = await Group.findById(groupId);

        if (!group) throw new Error('Group not found');

        // Check if requester is an admin
        if (!group.admins.includes(socket.user.id as any)) {
          throw new Error('Unauthorized: Only admins can change roles');
        }

        // Verify target user is a group member
        if (!group.members.includes(targetUserId as any)) {
          throw new Error('Target user is not a member of this group');
        }

        if (action === 'promote') {
          await Group.findByIdAndUpdate(groupId, { $addToSet: { admins: targetUserId } });
        } else if (action === 'demote') {
          // Prevent last admin from removing themselves if desired
          if (group.admins.length === 1 && group.admins[0]?.toString() === targetUserId) {
            throw new Error('Cannot demote the only admin');
          }
          await Group.findByIdAndUpdate(groupId, { $pull: { admins: targetUserId } });
        }

        io.to(groupId).emit('admin-status-updated', { targetUserId, action });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
      }
    },
  );
};
