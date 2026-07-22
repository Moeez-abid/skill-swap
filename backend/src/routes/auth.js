import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema } from '../middleware/validate.js';
import { apiError, apiSuccess } from '../utils/helpers.js';

const router = Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Try again later.' },
});

router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const { email, password, name } = req.body;
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return apiError(res, 409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash, name },
    select: { id: true, email: true, name: true, role: true, isVerified: true, verificationRequested: true, googleId: true, phoneVerified: true },
  });

  const token = signToken({ userId: user.id });
  return apiSuccess(res, { user, token }, 201);
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
  });
  if (!user || user.isBanned) return apiError(res, 401, 'Invalid credentials');

  if (!user.passwordHash) return apiError(res, 401, 'Please log in with Google');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return apiError(res, 401, 'Invalid credentials');

  const token = signToken({ userId: user.id });
  return apiSuccess(res, {
    user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl, isVerified: user.isVerified, verificationRequested: user.verificationRequested, googleId: user.googleId, phoneVerified: user.phoneVerified },
    token,
  });
});

router.post('/google', authLimiter, async (req, res) => {
  const { credential } = req.body;
  if (!credential) return apiError(res, 400, 'Missing credential');

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return apiError(res, 400, 'Invalid Google token');

    const email = payload.email.toLowerCase();
    
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: payload.name || 'Google User',
          googleId: payload.sub,
          avatarUrl: payload.picture,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { email },
        data: { googleId: payload.sub },
      });
    }

    if (user.isBanned) return apiError(res, 401, 'Account suspended');

    const token = signToken({ userId: user.id });
    return apiSuccess(res, {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl, isVerified: user.isVerified, verificationRequested: user.verificationRequested, googleId: user.googleId, phoneVerified: user.phoneVerified },
      token,
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    return apiError(res, 401, 'Google authentication failed');
  }
});

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, email: true, name: true, bio: true, location: true, avatarUrl: true,
      timezone: true, role: true, availabilityStatus: true,
      notifyMatches: true, notifyMessages: true, notifySessions: true,
      createdAt: true, isVerified: true, verificationRequested: true, googleId: true, phoneVerified: true,
    },
  });
  return apiSuccess(res, { user });
});

export default router;
