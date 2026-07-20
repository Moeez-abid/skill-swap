import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { apiError, apiSuccess } from '../utils/helpers.js';
import { triggerEvent } from '../lib/pusher.js';
import { signToken } from '../lib/jwt.js';

const router = Router();

router.use(authenticate, requireRole(['SUPER_ADMIN', 'MANAGER', 'MAINTENANCE_ADMIN']));

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
      id: true, email: true, name: true, role: true, isBanned: true,
      createdAt: true, _count: { select: { skills: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return apiSuccess(res, { users });
});

router.patch('/users/:id/ban', requireRole(['SUPER_ADMIN', 'MANAGER']), async (req, res) => {
  const { reason } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isBanned: true, bannedAt: new Date(), banReason: reason || 'Policy violation' },
  });

  await prisma.auditLog.create({
    data: {
      action: 'USER_BANNED',
      actorId: req.user.id,
      targetId: user.id,
      metadata: { reason },
    },
  });

  return apiSuccess(res, { user: { id: user.id, isBanned: true } });
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

router.get('/disputes', async (_req, res) => {
  const disputes = await prisma.dispute.findMany({
    include: {
      creator: { select: { id: true, name: true } },
      activeMatch: {
        include: {
          user1: { select: { id: true, name: true } },
          user2: { select: { id: true, name: true } }
        }
      },
      winner: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Lazy evaluation: auto-resolve disputes where deadline passed and status is PENDING_STANCES
  const updatedDisputes = await Promise.all(disputes.map(async (d) => {
    if (d.status === 'PENDING_STANCES' && new Date() > new Date(d.deadline)) {
      const match = d.activeMatch;
      let winnerId = null;
      let decision = 'Auto-resolved due to deadline passing.';
      
      if (d.user1Stance && !d.user2Stance) {
        winnerId = match.user1Id;
        decision += ` User 1 submitted stance, User 2 failed.`;
      } else if (!d.user1Stance && d.user2Stance) {
        winnerId = match.user2Id;
        decision += ` User 2 submitted stance, User 1 failed.`;
      } else {
        decision += ` Both users failed to submit a stance. Dismissed.`;
      }

      const updated = await prisma.dispute.update({
        where: { id: d.id },
        data: { status: 'RESOLVED', winnerId, decision },
        include: {
          creator: { select: { id: true, name: true } },
          activeMatch: {
            include: {
              user1: { select: { id: true, name: true } },
              user2: { select: { id: true, name: true } }
            }
          },
          winner: { select: { id: true, name: true } }
        }
      });
      return updated;
    }
    return d;
  }));

  return apiSuccess(res, { disputes: updatedDisputes });
});

router.post('/disputes/:id/resolve', async (req, res) => {
  const { decision, winnerId } = req.body;
  if (!decision || typeof decision !== 'string' || decision.trim() === '') {
    return apiError(res, 400, 'Decision is required');
  }

  const dispute = await prisma.dispute.update({
    where: { id: req.params.id },
    data: {
      status: 'RESOLVED',
      decision: decision.trim(),
      winnerId: winnerId || null
    },
    include: {
      creator: { select: { id: true, name: true } },
      activeMatch: {
        include: {
          user1: { select: { id: true, name: true } },
          user2: { select: { id: true, name: true } }
        }
      },
      winner: { select: { id: true, name: true } }
    }
  });

  await prisma.auditLog.create({
    data: {
      action: 'DISPUTE_RESOLVED',
      actorId: req.user.id,
      metadata: { disputeId: dispute.id, winnerId }
    }
  });

  return apiSuccess(res, { dispute });
});

router.get('/verifications', async (req, res) => {
  const users = await prisma.user.findMany({
    where: { verificationRequested: true, isVerified: false, deletedAt: null },
    select: { id: true, name: true, email: true, createdAt: true, portfolioUrl: true, linkedinUrl: true },
    orderBy: { createdAt: 'desc' }
  });
  return apiSuccess(res, { users });
});

router.patch('/verifications/:id/approve', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isVerified: true, verificationRequested: false }
  });
  
  await prisma.auditLog.create({
    data: {
      action: 'VERIFICATION_APPROVED',
      actorId: req.user.id,
      targetId: user.id,
      metadata: { email: user.email },
    }
  });
  

  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'SYSTEM',
      title: 'Profile Verified',
      message: 'Congratulations! Your profile verification request has been approved. You now have a verified badge on your profile.',
    }
  });
  await triggerEvent(`user-${user.id}`, 'new_notification', notification);

  return apiSuccess(res, { user });
});

router.patch('/verifications/:id/reject', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { verificationRequested: false }
  });
  
  await prisma.auditLog.create({
    data: {
      action: 'VERIFICATION_REJECTED',
      actorId: req.user.id,
      targetId: user.id,
      metadata: { email: user.email },
    }
  });

  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'SYSTEM',
      title: 'Verification Update',
      message: 'Your profile verification request was not approved at this time. Please ensure your profile is fully complete before trying again.',
    }
  });
  await triggerEvent(`user-${user.id}`, 'new_notification', notification);
  
  return apiSuccess(res, { user });
});

router.get('/audit-logs', async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      actor: { select: { name: true, email: true } },
    }
  });
  return apiSuccess(res, { logs });
});

router.delete('/groups/:id', requireRole(['SUPER_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const group = await prisma.group.findUnique({ where: { id: req.params.id } });
    if (!group) return apiError(res, 404, 'Group not found');

    await prisma.group.delete({ where: { id: req.params.id } });

    await prisma.auditLog.create({
      data: {
        action: 'GROUP_DELETED',
        actorId: req.user.id,
        metadata: { groupId: req.params.id, groupName: group.name },
      }
    });

    return apiSuccess(res, { message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// PATCH /admin/users/:id/role - Assign or remove Manager role (SUPER_ADMIN only)
router.patch('/users/:id/role', requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['USER', 'MANAGER'].includes(role)) {
      return apiError(res, 400, 'Role must be USER or MANAGER');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!targetUser) return apiError(res, 404, 'User not found');
    if (targetUser.role === 'SUPER_ADMIN') return apiError(res, 403, 'Cannot change role of a Super Admin');

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    await prisma.auditLog.create({
      data: {
        action: role === 'MANAGER' ? 'MANAGER_ASSIGNED' : 'MANAGER_REMOVED',
        actorId: req.user.id,
        targetId: updated.id,
        metadata: { previousRole: targetUser.role, newRole: role },
      },
    });

    return apiSuccess(res, { user: updated });
  } catch (error) {
    console.error('Error updating user role:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// POST /admin/impersonate/:id - Login as a user (SUPER_ADMIN only)
router.post('/impersonate/:id', requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, isVerified: true, verificationRequested: true },
    });
    if (!targetUser) return apiError(res, 404, 'User not found');
    if (targetUser.role === 'SUPER_ADMIN') return apiError(res, 403, 'Cannot impersonate another Super Admin');

    const token = signToken({ userId: targetUser.id });

    await prisma.auditLog.create({
      data: {
        action: 'USER_IMPERSONATED',
        actorId: req.user.id,
        targetId: targetUser.id,
        metadata: { impersonatedEmail: targetUser.email },
      },
    });

    return apiSuccess(res, { user: targetUser, token });
  } catch (error) {
    console.error('Error impersonating user:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

export default router;
