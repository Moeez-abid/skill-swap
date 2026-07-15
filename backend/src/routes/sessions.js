import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validate, sessionSchema, sessionUpdateSchema } from '../middleware/validate.js';
import { triggerEvent } from '../lib/pusher.js';
import { sendEmail } from '../lib/email.js';
import { apiError, apiSuccess } from '../utils/helpers.js';

const router = Router();

async function verifyMatchAccess(userId, matchId, requireActive = true) {
  const where = { id: matchId, OR: [{ user1Id: userId }, { user2Id: userId }] };
  if (requireActive) where.isActive = true;
  return prisma.activeMatch.findFirst({ 
    where,
    include: { user1: true, user2: true }
  });
}

router.get('/match/:matchId', authenticate, async (req, res) => {
  const match = await verifyMatchAccess(req.user.id, req.params.matchId, false);
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
  if (start < new Date()) {
    return apiError(res, 400, 'Cannot schedule a session in the past');
  }
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
  
  let notification = null;
  const partnerUser = match.user1Id === req.user.id ? match.user2 : match.user1;
  
  if (partnerUser.notifySessions) {
    notification = await prisma.notification.create({
      data: {
        userId: partnerId,
        type: 'SESSION_PROPOSED',
        title: 'New Session Proposed',
        content: `${req.user.name} proposed a new session.`,
        linkUrl: '/sessions',
      }
    });
    await triggerEvent(`user-${partnerId}`, 'session-proposed', { session, notification });
  } else {
    await triggerEvent(`user-${partnerId}`, 'session-proposed', { session });
  }

  if (partnerUser.emailNotifySessions) {
    sendEmail({
      to: partnerUser.email,
      subject: 'New Session Proposed!',
      html: `<p><strong>${req.user.name}</strong> proposed a new session for <strong>${start.toLocaleString()}</strong>.</p>
             <p>Agenda: <em>${req.body.agenda || 'No agenda provided'}</em></p>
             <br/>
             <p><a href="http://localhost:5173/sessions" style="display:inline-block;padding:10px 20px;background:#E92E20;color:#fff;text-decoration:none;border-radius:8px;">View & Respond</a></p>`
    });
  }

  return apiSuccess(res, { session }, 201);
});

router.patch('/:id/respond', authenticate, async (req, res) => {
  const { action, counterStart, counterEnd } = req.body;
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: { activeMatch: { include: { user1: true, user2: true } }, proposer: true },
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
  
  let notificationContent = '';
  if (action === 'accept') notificationContent = `${req.user.name} accepted your session proposal.`;
  else if (action === 'decline') notificationContent = `${req.user.name} declined your session proposal.`;
  else if (action === 'counter') notificationContent = `${req.user.name} proposed a new time for your session.`;

  let notification = null;
  if (session.proposer.notifySessions) {
    notification = await prisma.notification.create({
      data: {
        userId: session.proposerId,
        type: 'SESSION_UPDATED',
        title: 'Session Update',
        content: notificationContent,
        linkUrl: '/sessions',
      }
    });
    await triggerEvent(`user-${session.proposerId}`, 'session-updated', { session: updated, notification });
  } else {
    await triggerEvent(`user-${session.proposerId}`, 'session-updated', { session: updated });
  }

  if (session.proposer.emailNotifySessions) {
    sendEmail({
      to: session.proposer.email,
      subject: `Session ${data.status}`,
      html: `<p>Your session proposal was <strong>${data.status}</strong> by <strong>${req.user.name}</strong>.</p>
             <br/>
             <p><a href="http://localhost:5173/sessions" style="display:inline-block;padding:10px 20px;background:#E92E20;color:#fff;text-decoration:none;border-radius:8px;">View Details</a></p>`
    });
  }

  return apiSuccess(res, { session: updated });
});
router.patch('/:id', authenticate, validate(sessionUpdateSchema), async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: { activeMatch: true },
  });
  if (!session) return apiError(res, 404, 'Session not found');

  const isProposer = session.proposerId === req.user.id;
  if (!isProposer) return apiError(res, 403, 'Only the proposer can edit the session');

  const match = session.activeMatch;
  if (!match || !match.isActive) return apiError(res, 400, 'Cannot edit session for an inactive match');

  const data = { ...req.body };
  
  if (data.scheduledStart) {
    const start = new Date(data.scheduledStart);
    const duration = data.durationMinutes || session.durationMinutes;
    const end = new Date(start.getTime() + duration * 60000);
    data.scheduledStart = start;
    data.scheduledEnd = end;
  } else if (data.durationMinutes) {
    const end = new Date(session.scheduledStart.getTime() + data.durationMinutes * 60000);
    data.scheduledEnd = end;
  }

  data.status = 'PROPOSED'; // Reset to proposed on edit

  const updated = await prisma.session.update({
    where: { id: session.id },
    data,
  });

  const partnerId = match.user1Id === req.user.id ? match.user2Id : match.user1Id;
  
  const notification = await prisma.notification.create({
    data: {
      userId: partnerId,
      type: 'SESSION_UPDATED',
      title: 'Session Rescheduled',
      content: `${req.user.name} modified an existing session. Please review.`,
      linkUrl: '/sessions',
    }
  });

  await triggerEvent(`user-${partnerId}`, 'session-updated', { session: updated, notification });

  return apiSuccess(res, { session: updated });
});

router.patch('/:id/cancel', authenticate, async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: { activeMatch: true }
  });

  if (!session) return apiError(res, 404, 'Session not found');

  const match = session.activeMatch;
  const isPartner = match.user1Id === req.user.id || match.user2Id === req.user.id;
  if (!isPartner) return apiError(res, 403, 'Only partners can cancel this session');

  if (session.status !== 'PROPOSED' && session.status !== 'ACCEPTED') {
    return apiError(res, 400, 'Only pending or accepted sessions can be cancelled');
  }

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: { status: 'CANCELLED' }
  });

  const partnerId = match.user1Id === req.user.id ? match.user2Id : match.user1Id;

  const notification = await prisma.notification.create({
    data: {
      userId: partnerId,
      type: 'SESSION_UPDATED',
      title: 'Session Cancelled',
      content: `${req.user.name} cancelled the session scheduled for ${new Date(session.scheduledStart).toLocaleDateString()}.`,
      linkUrl: '/sessions',
    }
  });

  await triggerEvent(`user-${partnerId}`, 'session-cancelled', { session: updated, notification });

  return apiSuccess(res, { session: updated });
});

export default router;
