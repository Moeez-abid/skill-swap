import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { apiError, apiSuccess } from '../utils/helpers.js';

const router = Router();

// Get user's notifications
router.get('/', authenticate, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50, // Limit to 50 recent notifications
  });
  return apiSuccess(res, { notifications });
});

// Mark a single notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
  const notification = await prisma.notification.findUnique({
    where: { id: req.params.id }
  });

  if (!notification) {
    return apiError(res, 404, 'Notification not found');
  }

  if (notification.userId !== req.user.id) {
    return apiError(res, 403, 'Access denied');
  }

  const updated = await prisma.notification.delete({
    where: { id: notification.id }
  });

  return apiSuccess(res, { notification: updated });
});

// Mark all notifications as read
router.patch('/read-all', authenticate, async (req, res) => {
  const updated = await prisma.notification.deleteMany({
    where: { userId: req.user.id }
  });

  return apiSuccess(res, { count: updated.count });
});

export default router;
