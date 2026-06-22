import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { apiSuccess } from '../utils/helpers.js';

const router = Router();

router.get('/community', async (_req, res) => {
  const [totalUsers, skillsExchanged, activeMatches] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null, role: 'USER' } }),
    prisma.matchRequest.count({ where: { status: { in: ['COMPLETED', 'ACCEPTED'] } } }),
    prisma.activeMatch.count({ where: { isActive: true } }),
  ]);

  return apiSuccess(res, {
    stats: { totalUsers, skillsExchanged, activeMatches },
  });
});

export default router;
