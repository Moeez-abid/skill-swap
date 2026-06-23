import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validate, sessionSchema } from '../middleware/validate.js';
import { triggerEvent } from '../lib/pusher.js';
import { apiError, apiSuccess } from '../utils/helpers.js';

const router = Router();

async function verifyMatchAccess(userId, matchId) {
  return prisma.activeMatch.findFirst({
    where: { id: matchId, isActive: true, OR: [{ user1Id: userId }, { user2Id: userId }] },
  });
}

router.get('/match/:matchId', authenticate, async (req, res) => {
  const match = await verifyMatchAccess(req.user.id, req.params.matchId);
  if (!match) return apiError(res, 403, 'Access denied');

  const sessions = await prisma.session.findMany({
    where: { activeMatchId: match.id },
    orderBy: { scheduledStart: 'asc' },
    include: { proposer: { select: { id: true, name: true, avatarUrl: true } }, reviews: true },
  });

  const sanitizedSessions = sessions.map(s => {
    const sanitizedReviews = s.reviews.map(r => {
      if (!r.isRevealed && r.reviewerId !== req.user.id) {
        return {
          id: r.id,
          sessionId: r.sessionId,
          reviewerId: r.reviewerId,
          revieweeId: r.revieweeId,
          isRevealed: false,
          createdAt: r.createdAt,
          ratingOverall: 0,
          ratingTeaching: 0,
          ratingCommunication: 0,
          ratingPunctuality: 0,
          feedback: 'Hidden until both users submit reviews.'
        };
      }
      return r;
    });
    return { ...s, reviews: sanitizedReviews };
  });

  return apiSuccess(res, { sessions: sanitizedSessions });
});

router.post('/match/:matchId', authenticate, validate(sessionSchema), async (req, res) => {
  const match = await verifyMatchAccess(req.user.id, req.params.matchId);
  if (!match) return apiError(res, 403, 'Access denied');

  const start = new Date(req.body.scheduledStart);
  const end = new Date(start.getTime() + req.body.durationMinutes * 60000);

  const session = await prisma.session.create({
    data: {
      activeMatchId: match.id,
      proposerId: req.user.id,
      scheduledStart: start,
      scheduledEnd: end,
      durationMinutes: req.body.durationMinutes,
      agenda: req.body.agenda,
      meetingMethod: req.body.meetingMethod || 'VIDEO',
      meetingDetails: req.body.meetingDetails,
      status: 'PROPOSED',
    },
    include: { proposer: { select: { id: true, name: true, avatarUrl: true } } },
  });

  const partnerId = match.user1Id === req.user.id ? match.user2Id : match.user1Id;
  await triggerEvent(`user-${partnerId}`, 'session-proposed', { session });

  return apiSuccess(res, { session }, 201);
});

router.patch('/:id/respond', authenticate, async (req, res) => {
  const { action, counterStart, counterEnd } = req.body;
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: { activeMatch: true },
  });
  if (!session) return apiError(res, 404, 'Session not found');

  const match = session.activeMatch;
  const isPartner = match.user1Id === req.user.id || match.user2Id === req.user.id;
  const isProposer = session.proposerId === req.user.id;
  if (!isPartner || isProposer) return apiError(res, 403, 'Only the receiving partner can respond');

  let data = {};
  if (action === 'accept') data = { status: 'ACCEPTED' };
  else if (action === 'decline') data = { status: 'DECLINED' };
  else if (action === 'counter' && counterStart && counterEnd) {
    data = {
      status: 'COUNTER_PROPOSED',
      counterStart: new Date(counterStart),
      counterEnd: new Date(counterEnd),
    };
  } else return apiError(res, 400, 'Invalid action');

  const updated = await prisma.session.update({ where: { id: session.id }, data });
  await triggerEvent(`user-${session.proposerId}`, 'session-updated', { session: updated });

  return apiSuccess(res, { session: updated });
});

export default router;
