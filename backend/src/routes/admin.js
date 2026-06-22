import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { apiError, apiSuccess } from '../utils/helpers.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/analytics', async (_req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers, newUsers, totalSkills, newSkills,
    totalMatches, completedMatches, pendingFlags,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null, role: 'USER' } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.skill.count(),
    prisma.skill.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.activeMatch.count(),
    prisma.matchRequest.count({ where: { status: 'COMPLETED' } }),
    prisma.flag.count({ where: { status: 'PENDING' } }),
  ]);

  return apiSuccess(res, {
    analytics: {
      users: { total: totalUsers, growth30d: newUsers },
      skills: { total: totalSkills, created30d: newSkills },
      matches: { active: totalMatches, completed: completedMatches },
      moderation: { pendingFlags },
    },
  });
});

router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true, email: true, name: true, role: true, isSuspended: true,
      createdAt: true, _count: { select: { skills: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return apiSuccess(res, { users });
});

router.patch('/users/:id/suspend', async (req, res) => {
  const { reason } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isSuspended: true, suspendedAt: new Date(), suspendedReason: reason || 'Policy violation' },
  });

  await prisma.auditLog.create({
    data: {
      action: 'USER_SUSPENDED',
      actorId: req.user.id,
      targetId: user.id,
      metadata: { reason },
    },
  });

  return apiSuccess(res, { user: { id: user.id, isSuspended: true } });
});

router.get('/moderation', async (_req, res) => {
  const flags = await prisma.flag.findMany({
    where: { status: 'PENDING' },
    include: { reporter: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return apiSuccess(res, { flags });
});

router.patch('/moderation/:id', async (req, res) => {
  const { status } = req.body;
  if (!['RESOLVED', 'DISMISSED'].includes(status)) {
    return apiError(res, 400, 'Invalid status');
  }

  const flag = await prisma.flag.update({
    where: { id: req.params.id },
    data: { status, resolvedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      action: `FLAG_${status}`,
      actorId: req.user.id,
      metadata: { flagId: flag.id, targetType: flag.targetType, targetId: flag.targetId },
    },
  });

  return apiSuccess(res, { flag });
});

router.get('/audit', async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    include: {
      actor: { select: { id: true, name: true } },
      target: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return apiSuccess(res, { logs });
});

export default router;
