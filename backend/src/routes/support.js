import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { apiError, apiSuccess } from '../utils/helpers.js';

const router = Router();

// Public route: Submit a support message
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      return apiError(res, 400, 'Name, email, and message are required');
    }

    const supportMsg = await prisma.supportMessage.create({
      data: {
        name,
        email,
        message,
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

export default router;
