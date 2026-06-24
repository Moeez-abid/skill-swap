import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { uploadFile } from '../lib/cloudinary.js';
import { authenticate } from '../middleware/auth.js';
import { triggerEvent } from '../lib/pusher.js';
import { apiError, apiSuccess, sanitizeString } from '../utils/helpers.js';

import fs from 'fs';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const msgLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Message rate limit exceeded' },
});

async function getConversation(userId, convId) {
  return prisma.conversation.findFirst({
    where: {
      id: convId,
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: { select: { id: true, name: true, avatarUrl: true } },
      user2: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
}

router.get('/conversations', authenticate, async (req, res) => {
  const convos = await prisma.conversation.findMany({
    where: {
      OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
    },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      user1: { select: { id: true, name: true, avatarUrl: true } },
      user2: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  const conversations = await Promise.all(
    convos.map(async (c) => {
      const partner = c.user1Id === req.user.id ? c.user2 : c.user1;
      const unread = await prisma.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: req.user.id },
          isRead: false,
        },
      });
      const lastMessage = c.messages[0] || null;
      return { conversationId: c.id, partner, lastMessage, unreadCount: unread };
    })
  );

  conversations.sort((a, b) => {
    const ta = a.lastMessage?.createdAt || 0;
    const tb = b.lastMessage?.createdAt || 0;
    return new Date(tb) - new Date(ta);
  });

  return apiSuccess(res, { conversations });
});

router.post('/conversations', authenticate, async (req, res) => {
  const { partnerId } = req.body;
  if (!partnerId) return apiError(res, 400, 'Partner ID required');
  if (partnerId === req.user.id) return apiError(res, 400, 'Cannot chat with yourself');

  const partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner) return apiError(res, 404, 'User not found');

  let conv = await prisma.conversation.findFirst({
    where: {
      OR: [
        { user1Id: req.user.id, user2Id: partnerId },
        { user1Id: partnerId, user2Id: req.user.id }
      ]
    }
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        user1Id: req.user.id,
        user2Id: partnerId,
      }
    });
  }

  return apiSuccess(res, { conversationId: conv.id });
});

router.get('/:conversationId/messages', authenticate, async (req, res) => {
  const conv = await getConversation(req.user.id, req.params.conversationId);
  if (!conv) return apiError(res, 403, 'No active conversation');

  const messages = await prisma.message.findMany({
    where: { conversationId: conv.id },
    include: { replyTo: true, sender: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' }
  });

  await prisma.message.updateMany({
    where: {
      conversationId: conv.id,
      senderId: { not: req.user.id },
      isRead: false,
    },
    data: { isRead: true, readAt: new Date() },
  });

  return apiSuccess(res, { messages, partner: conv.user1Id === req.user.id ? conv.user2 : conv.user1 });
});

router.post('/:conversationId/messages', authenticate, msgLimiter, upload.single('file'), async (req, res) => {
  const conv = await getConversation(req.user.id, req.params.conversationId);
  if (!conv) return apiError(res, 403, 'No active conversation');

  let fileUrl, fileName, fileType;
  if (req.file) {
    const result = await uploadFile(req.file.buffer);
    if (result && result.secure_url) {
      fileUrl = result.secure_url;
    } else {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = uniqueSuffix + '-' + req.file.originalname;
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
      fileUrl = `/uploads/${filename}`;
    }
    fileName = req.file.originalname;
    fileType = req.file.mimetype;
  }

  const content = req.body.content ? sanitizeString(req.body.content) : null;
  if (!content && !fileUrl) return apiError(res, 400, 'Message content or file required');

  const message = await prisma.message.create({
    data: {
      conversationId: conv.id,
      senderId: req.user.id,
      content,
      fileUrl,
      fileName,
      fileType,
      replyToId: req.body.replyToId || null,
    },
    include: { replyTo: true, sender: { select: { id: true, name: true, avatarUrl: true } } },
  });

  const partnerId = conv.user1Id === req.user.id ? conv.user2Id : conv.user1Id;
  await triggerEvent(`user-${partnerId}`, 'new-message', { message, conversationId: conv.id });

  return apiSuccess(res, { message }, 201);
});

router.post('/bulk-delete', authenticate, async (req, res) => {
  const { messageIds } = req.body;
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return apiError(res, 400, 'Invalid messageIds');
  }

  const messagesToDelete = await prisma.message.findMany({
    where: { id: { in: messageIds }, senderId: req.user.id },
    select: { id: true, conversationId: true, conversation: { select: { user1Id: true, user2Id: true } } }
  });

  if (messagesToDelete.length === 0) return apiSuccess(res, { success: true });

  await prisma.message.deleteMany({
    where: { id: { in: messagesToDelete.map(m => m.id) } }
  });

  const byConv = {};
  messagesToDelete.forEach(m => {
    if (!byConv[m.conversationId]) {
      byConv[m.conversationId] = {
        ids: [],
        partnerId: m.conversation.user1Id === req.user.id ? m.conversation.user2Id : m.conversation.user1Id
      };
    }
    byConv[m.conversationId].ids.push(m.id);
  });

  for (const [convId, data] of Object.entries(byConv)) {
    await triggerEvent(`user-${data.partnerId}`, 'messages-deleted', { messageIds: data.ids, conversationId: convId });
  }

  return apiSuccess(res, { success: true });
});

router.delete('/conversations/:conversationId', authenticate, async (req, res) => {
  const conv = await getConversation(req.user.id, req.params.conversationId);
  if (!conv) return apiError(res, 403, 'No active conversation');

  await prisma.conversation.delete({
    where: { id: conv.id }
  });

  const partnerId = conv.user1Id === req.user.id ? conv.user2Id : conv.user1Id;
  await triggerEvent(`user-${partnerId}`, 'conversation-deleted', { conversationId: conv.id });

  return apiSuccess(res, { success: true });
});

router.delete('/:conversationId/messages/:messageId', authenticate, async (req, res) => {
  const conv = await getConversation(req.user.id, req.params.conversationId);
  if (!conv) return apiError(res, 403, 'No active conversation');

  const message = await prisma.message.findUnique({
    where: { id: req.params.messageId }
  });

  if (!message || message.conversationId !== conv.id) {
    return apiError(res, 404, 'Message not found');
  }

  if (message.senderId !== req.user.id) {
    return apiError(res, 403, 'You can only delete your own messages');
  }

  await prisma.message.delete({
    where: { id: message.id }
  });

  const partnerId = conv.user1Id === req.user.id ? conv.user2Id : conv.user1Id;
  await triggerEvent(`user-${partnerId}`, 'message-deleted', { messageId: message.id, conversationId: conv.id });

  return apiSuccess(res, { success: true });
});

export default router;
