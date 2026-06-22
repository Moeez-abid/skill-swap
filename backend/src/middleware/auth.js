import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { apiError } from '../utils/helpers.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return apiError(res, 401, 'Authentication required');
  }

  try {
    const decoded = verifyToken(header.slice(7));
    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, deletedAt: null, isSuspended: false },
      select: {
        id: true, email: true, name: true, role: true, avatarUrl: true, timezone: true,
      },
    });
    if (!user) return apiError(res, 401, 'Invalid or expired token');
    req.user = user;
    next();
  } catch {
    return apiError(res, 401, 'Invalid or expired token');
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  try {
    const decoded = verifyToken(header.slice(7));
    req.user = { id: decoded.userId };
    next();
  } catch {
    next();
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return apiError(res, 403, 'Administrator access required');
  }
  next();
}
