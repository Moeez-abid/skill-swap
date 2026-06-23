import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validate, matchRequestSchema } from '../middleware/validate.js';
import { triggerEvent } from '../lib/pusher.js';
import { apiError, apiSuccess } from '../utils/helpers.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const { direction = 'all' } = req.query;
  const base = {
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
      receiver: { select: { id: true, name: true, avatarUrl: true } },
      offeredSkill: { select: { id: true, title: true } },
      wantedSkill: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  };

  let requests = [];
  if (direction === 'incoming' || direction === 'all') {
    const incoming = await prisma.matchRequest.findMany({
      ...base,
      where: { receiverId: req.user.id },
    });
    requests = requests.concat(incoming.map((r) => ({ ...r, direction: 'incoming' })));
  }
  if (direction === 'outgoing' || direction === 'all') {
    const outgoing = await prisma.matchRequest.findMany({
      ...base,
      where: { senderId: req.user.id },
    });
    requests = requests.concat(outgoing.map((r) => ({ ...r, direction: 'outgoing' })));
  }

  requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return apiSuccess(res, { requests });
});

router.get('/active', authenticate, async (req, res) => {
  const { status = 'active' } = req.query;
  const where = { OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }] };
  if (status === 'active') where.isActive = true;
  if (status === 'past') where.isActive = false;

  const matches = await prisma.activeMatch.findMany({
    where,
    include: {
      user1: { select: { id: true, name: true, avatarUrl: true } },
      user2: { select: { id: true, name: true, avatarUrl: true } },
      matchRequest: {
        include: {
          offeredSkill: { select: { id: true, title: true } },
          wantedSkill: { select: { id: true, title: true } }
        }
      },
      reviews: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const activeMatches = matches.map(m => {
    const partner = m.user1Id === req.user.id ? m.user2 : m.user1;
    const sanitizedReviews = m.reviews.map(r => {
      if (!r.isRevealed && r.reviewerId !== req.user.id) {
        return {
          id: r.id,
          activeMatchId: r.activeMatchId,
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
    return { ...m, partner, reviews: sanitizedReviews };
  });

  return apiSuccess(res, { activeMatches });
});

router.post('/', authenticate, validate(matchRequestSchema), async (req, res) => {
  const { offeredSkillId, wantedSkillId, message } = req.body;

  const [offered, wanted] = await Promise.all([
    prisma.skill.findUnique({ where: { id: offeredSkillId } }),
    prisma.skill.findUnique({ where: { id: wantedSkillId }, include: { provider: true } }),
  ]);

  if (!offered || offered.providerId !== req.user.id) {
    return apiError(res, 400, 'Offered skill must belong to you');
  }
  if (!wanted || wanted.providerId === req.user.id) {
    return apiError(res, 400, 'Invalid wanted skill');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const request = await prisma.matchRequest.create({
    data: {
      senderId: req.user.id,
      receiverId: wanted.providerId,
      offeredSkillId,
      wantedSkillId,
      message,
      expiresAt,
    },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
      receiver: { select: { id: true, name: true, avatarUrl: true } },
      offeredSkill: { select: { id: true, title: true } },
      wantedSkill: { select: { id: true, title: true } },
    },
  });

  await prisma.skill.update({
    where: { id: wantedSkillId },
    data: { requestCount: { increment: 1 } },
  });

  await triggerEvent(`user-${wanted.providerId}`, 'match-request', { request });

  return apiSuccess(res, { request }, 201);
});

router.patch('/:id/status', authenticate, async (req, res) => {
  const { status } = req.body;
  const allowed = ['ACCEPTED', 'DECLINED', 'CANCELLED'];
  if (!allowed.includes(status)) return apiError(res, 400, 'Invalid status');

  const request = await prisma.matchRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return apiError(res, 404, 'Request not found');
  if (request.status !== 'PENDING') return apiError(res, 400, 'Request already processed');

  const isReceiver = request.receiverId === req.user.id;
  const isSender = request.senderId === req.user.id;
  if (status === 'CANCELLED' && !isSender) return apiError(res, 403, 'Only sender can cancel');
  if ((status === 'ACCEPTED' || status === 'DECLINED') && !isReceiver) {
    return apiError(res, 403, 'Only receiver can accept or decline');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const mr = await tx.matchRequest.update({
      where: { id: request.id },
      data: { status },
    });

    if (status === 'ACCEPTED') {
      const activeMatch = await tx.activeMatch.create({
        data: {
          matchRequestId: mr.id,
          user1Id: mr.senderId,
          user2Id: mr.receiverId,
        },
      });
      let conv = await tx.conversation.findFirst({
        where: {
          OR: [
            { user1Id: mr.senderId, user2Id: mr.receiverId },
            { user1Id: mr.receiverId, user2Id: mr.senderId }
          ]
        }
      });

      if (conv) {
        await tx.conversation.update({
          where: { id: conv.id },
          data: { activeMatchId: activeMatch.id }
        });
      } else {
        await tx.conversation.create({
          data: {
            activeMatchId: activeMatch.id,
            user1Id: mr.senderId,
            user2Id: mr.receiverId,
          }
        });
      }
      await triggerEvent(`user-${mr.senderId}`, 'match-accepted', { matchRequestId: mr.id });
    }

    return mr;
  });

  return apiSuccess(res, { request: updated });
});

router.patch('/active/:id/complete', authenticate, async (req, res) => {
  const match = await prisma.activeMatch.findUnique({ where: { id: req.params.id } });
  if (!match) return apiError(res, 404, 'Match not found');
  if (!match.isActive) return apiError(res, 400, 'Match is already completed');
  
  const isParticipant = match.user1Id === req.user.id || match.user2Id === req.user.id;
  if (!isParticipant) return apiError(res, 403, 'Access denied');

  const updated = await prisma.$transaction(async (tx) => {
    const am = await tx.activeMatch.update({
      where: { id: match.id },
      data: { isActive: false },
    });
    await tx.matchRequest.update({
      where: { id: match.matchRequestId },
      data: { status: 'COMPLETED' },
    });
    return am;
  });

  return apiSuccess(res, { match: updated });
});

export default router;
