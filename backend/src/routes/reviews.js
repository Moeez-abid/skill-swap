import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validate, reviewSchema } from '../middleware/validate.js';
import { apiError, apiSuccess } from '../utils/helpers.js';

const router = Router();

router.post('/session/:sessionId', authenticate, validate(reviewSchema), async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.sessionId },
    include: { activeMatch: true, reviews: true },
  });
  if (!session) return apiError(res, 404, 'Session not found');
  if (session.status !== 'COMPLETED' && session.status !== 'ACCEPTED') {
    return apiError(res, 400, 'Session must be completed before reviewing');
  }

  const match = session.activeMatch;
  const isParticipant = match.user1Id === req.user.id || match.user2Id === req.user.id;
  if (!isParticipant) return apiError(res, 403, 'Access denied');

  const revieweeId = match.user1Id === req.user.id ? match.user2Id : match.user1Id;
  const existing = session.reviews.find((r) => r.reviewerId === req.user.id);
  if (existing) {
    if (existing.lockedAt) return apiError(res, 400, 'Review is locked and cannot be edited');
    const updated = await prisma.review.update({
      where: { id: existing.id },
      data: { ...req.body, lockedAt: new Date(Date.now() + 48 * 60 * 60 * 1000) },
    });
    await revealIfBothSubmitted(session.id);
    return apiSuccess(res, { review: updated });
  }

  const review = await prisma.review.create({
    data: {
      sessionId: session.id,
      reviewerId: req.user.id,
      revieweeId,
      ...req.body,
      lockedAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  await revealIfBothSubmitted(session.id);
  return apiSuccess(res, { review }, 201);
});

router.get('/featured', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { 
        isRevealed: true,
        ratingOverall: 5,
        feedback: { not: '' } // Must have a written review
      },
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true } },
        session: { 
          include: { 
            activeMatch: {
              include: {
                matchRequest: {
                  include: {
                    offeredSkill: { select: { title: true } },
                    wantedSkill: { select: { title: true } }
                  }
                }
              }
            } 
          } 
        },
        activeMatch: {
          include: {
            matchRequest: {
              include: {
                offeredSkill: { select: { title: true } },
                wantedSkill: { select: { title: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 6, // Fetch top 6 recent 5-star reviews
    });
    return apiSuccess(res, { reviews });
  } catch (error) {
    console.error('Error fetching featured reviews:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

router.get('/user/:userId', async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { revieweeId: req.params.userId, isRevealed: true },
    include: {
      reviewer: { select: { id: true, name: true, avatarUrl: true } },
      session: { select: { id: true, scheduledStart: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return apiSuccess(res, { reviews });
});

async function revealIfBothSubmitted(sessionId) {
  const reviews = await prisma.review.findMany({ where: { sessionId } });
  if (reviews.length >= 2) {
    await prisma.review.updateMany({
      where: { sessionId },
      data: { isRevealed: true },
    });
  }
}

async function revealMatchIfBothSubmitted(activeMatchId) {
  const reviews = await prisma.review.findMany({ where: { activeMatchId } });
  if (reviews.length >= 2) {
    await prisma.review.updateMany({
      where: { activeMatchId },
      data: { isRevealed: true },
    });
  }
}

router.post('/match/:matchId', authenticate, validate(reviewSchema), async (req, res) => {
  const match = await prisma.activeMatch.findUnique({
    where: { id: req.params.matchId },
    include: { reviews: true },
  });
  if (!match) return apiError(res, 404, 'Match not found');
  if (match.isActive) {
    return apiError(res, 400, 'Match must be completed before reviewing');
  }

  const isParticipant = match.user1Id === req.user.id || match.user2Id === req.user.id;
  if (!isParticipant) return apiError(res, 403, 'Access denied');

  const revieweeId = match.user1Id === req.user.id ? match.user2Id : match.user1Id;
  const existing = match.reviews.find((r) => r.reviewerId === req.user.id);
  
  if (existing) {
    if (existing.lockedAt) return apiError(res, 400, 'Review is locked and cannot be edited');
    const updated = await prisma.review.update({
      where: { id: existing.id },
      data: { ...req.body, lockedAt: new Date(Date.now() + 48 * 60 * 60 * 1000) },
    });
    await revealMatchIfBothSubmitted(match.id);
    return apiSuccess(res, { review: updated });
  }

  const review = await prisma.review.create({
    data: {
      activeMatchId: match.id,
      reviewerId: req.user.id,
      revieweeId,
      ...req.body,
      lockedAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  await revealMatchIfBothSubmitted(match.id);
  return apiSuccess(res, { review }, 201);
});

export default router;
