import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { apiError, apiSuccess } from '../utils/helpers.js';

const router = Router();

// Create a new dispute for a match
router.post('/match/:matchId', authenticate, async (req, res) => {
  const match = await prisma.activeMatch.findFirst({
    where: { 
      id: req.params.matchId, 
      isActive: true, 
      OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }] 
    },
    include: { dispute: true }
  });

  if (!match) return apiError(res, 404, 'Active match not found or access denied');
  if (match.dispute) return apiError(res, 400, 'A dispute already exists for this match');

  // Deadline: 3 days from now
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 3);

  const dispute = await prisma.dispute.create({
    data: {
      activeMatchId: match.id,
      creatorId: req.user.id,
      deadline,
      status: 'PENDING_STANCES'
    }
  });

  return apiSuccess(res, { dispute }, 201);
});

// Submit a stance for a dispute
router.post('/:id/stance', authenticate, async (req, res) => {
  const { stance } = req.body;
  if (!stance || typeof stance !== 'string' || stance.trim() === '') {
    return apiError(res, 400, 'Stance is required');
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: req.params.id },
    include: { activeMatch: true }
  });

  if (!dispute) return apiError(res, 404, 'Dispute not found');
  if (dispute.status !== 'PENDING_STANCES') return apiError(res, 400, 'Dispute is no longer accepting stances');

  if (new Date() > new Date(dispute.deadline)) {
    return apiError(res, 400, 'The deadline for submitting a stance has passed');
  }

  const match = dispute.activeMatch;
  if (match.user1Id !== req.user.id && match.user2Id !== req.user.id) {
    return apiError(res, 403, 'Access denied');
  }

  const isUser1 = match.user1Id === req.user.id;
  
  if (isUser1 && dispute.user1Stance) return apiError(res, 400, 'Stance already submitted');
  if (!isUser1 && dispute.user2Stance) return apiError(res, 400, 'Stance already submitted');

  const updateData = {};
  if (isUser1) updateData.user1Stance = stance.trim();
  else updateData.user2Stance = stance.trim();

  const user1HasStance = isUser1 ? true : !!dispute.user1Stance;
  const user2HasStance = !isUser1 ? true : !!dispute.user2Stance;

  if (user1HasStance && user2HasStance) {
    updateData.status = 'UNDER_REVIEW';
  }

  const updatedDispute = await prisma.dispute.update({
    where: { id: dispute.id },
    data: updateData
  });

  return apiSuccess(res, { dispute: updatedDispute });
});

export default router;
