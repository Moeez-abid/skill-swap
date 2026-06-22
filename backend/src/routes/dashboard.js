import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { apiSuccess } from '../utils/helpers.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const [
    skillCount,
    activeMatches,
    avgReview,
    pendingIncoming,
    upcomingSessions,
    recentMessages,
  ] = await Promise.all([
    prisma.skill.count({ where: { providerId: userId } }),
    prisma.activeMatch.count({
      where: { isActive: true, OR: [{ user1Id: userId }, { user2Id: userId }] },
    }),
    prisma.review.aggregate({
      where: { revieweeId: userId, isRevealed: true },
      _avg: { ratingOverall: true },
    }),
    prisma.matchRequest.count({ where: { receiverId: userId, status: 'PENDING' } }),
    prisma.session.findMany({
      where: {
        status: { in: ['ACCEPTED', 'PROPOSED'] },
        scheduledStart: { gte: now, lte: weekAhead },
        activeMatch: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      },
      orderBy: { scheduledStart: 'asc' },
      take: 10,
      include: {
        activeMatch: {
          include: {
            user1: { select: { id: true, name: true, avatarUrl: true } },
            user2: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    }),
    prisma.message.findMany({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        conversation: true,
      },
    }),
  ]);

  return apiSuccess(res, {
    dashboard: {
      overview: {
        totalSkills: skillCount,
        activeMatches,
        avgRating: Math.round((avgReview._avg.ratingOverall || 0) * 10) / 10,
      },
      pendingActions: pendingIncoming,
      upcomingSessions: upcomingSessions.map((s) => ({
        ...s,
        partner: s.activeMatch.user1Id === userId ? s.activeMatch.user2 : s.activeMatch.user1,
      })),
      unreadMessages: recentMessages,
    },
  });
});

export default router;
