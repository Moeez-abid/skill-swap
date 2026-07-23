import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { apiError, apiSuccess } from '../utils/helpers.js';

const router = Router();

// Public route: Check if an appeal is already submitted for an email
router.get('/check-appeal', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return apiError(res, 400, 'Email query parameter is required');
    }
    const existingAppeal = await prisma.supportMessage.findFirst({
      where: {
        email: email,
        isAppeal: true
      }
    });
    return apiSuccess(res, { hasAppealed: !!existingAppeal });
  } catch (error) {
    console.error('Error checking appeal:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// Public route: Submit a support message
router.post('/', async (req, res) => {
  try {
    const { name, email, message, isAppeal } = req.body;
    
    if (!name || !email || !message) {
      return apiError(res, 400, 'Name, email, and message are required');
    }

    const supportMsg = await prisma.supportMessage.create({
      data: {
        name,
        email,
        message,
        isAppeal: !!isAppeal
      },
    });

    return apiSuccess(res, { supportMessage: supportMsg }, 201);
  } catch (error) {
    console.error('Error creating support message:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// Admin route: Get all support messages
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const messages = await prisma.supportMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return apiSuccess(res, { messages });
  } catch (error) {
    console.error('Error fetching support messages:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// Admin route: Mark message as read
router.patch('/:id/read', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const message = await prisma.supportMessage.update({
      where: { id },
      data: { isRead: true },
    });
    return apiSuccess(res, { message });
  } catch (error) {
    console.error('Error updating support message:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// Admin route: Accept ban appeal
router.post('/:id/accept-appeal', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await prisma.supportMessage.findUnique({ where: { id } });
    if (!msg || !msg.isAppeal) {
      return apiError(res, 404, 'Appeal message not found');
    }

    // Find the user by email (case-insensitive check)
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: msg.email,
          mode: 'insensitive'
        }
      }
    });

    if (!user) {
      return apiError(res, 404, `No active account found for email: ${msg.email}`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isBanned: false, bannedAt: null, banReason: null },
    });

    await prisma.auditLog.create({
      data: {
        action: 'USER_UNBANNED',
        actorId: req.user.id,
        targetId: user.id,
        metadata: { appealId: id }
      },
    });

    // Mark the appeal support message as read
    await prisma.supportMessage.update({
      where: { id },
      data: { isRead: true },
    });

    // Mark other appeals for this email as read too
    await prisma.supportMessage.updateMany({
      where: { email: msg.email, isAppeal: true },
      data: { isRead: true }
    });

    return apiSuccess(res, { message: 'Appeal accepted and user unbanned successfully' });
  } catch (error) {
    console.error('Error accepting appeal:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// Admin route: Reject ban appeal
router.post('/:id/reject-appeal', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await prisma.supportMessage.findUnique({ where: { id } });
    if (!msg || !msg.isAppeal) {
      return apiError(res, 404, 'Appeal message not found');
    }

    // Mark the appeal support message as read
    await prisma.supportMessage.update({
      where: { id },
      data: { isRead: true },
    });

    // Mark other appeals for this email as read too
    await prisma.supportMessage.updateMany({
      where: { email: msg.email, isAppeal: true },
      data: { isRead: true }
    });

    return apiSuccess(res, { message: 'Appeal rejected successfully' });
  } catch (error) {
    console.error('Error rejecting appeal:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

export default router;
