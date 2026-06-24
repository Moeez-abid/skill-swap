import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validate, profileUpdateSchema, passwordUpdateSchema } from '../middleware/validate.js';
import { apiError, apiSuccess, sanitizeString } from '../utils/helpers.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { uploadImage } from '../lib/cloudinary.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', authenticate, async (req, res) => {
  const usersList = await prisma.user.findMany({
    where: { id: { not: req.user.id }, deletedAt: null, isSuspended: false },
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: 'asc' }
  });
  return apiSuccess(res, { users: usersList });
});

router.get('/:id/profile', async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, deletedAt: null, isSuspended: false },
    select: {
      id: true, name: true, headline: true, bio: true, location: true, avatarUrl: true,
      linkedinUrl: true, githubUrl: true, portfolioUrl: true,
      availabilityStatus: true, createdAt: true,
      skills: {
        where: { provider: { deletedAt: null } },
        include: { category: true, tags: { include: { tag: true } } },
      },
      wantedSkills: true,
      reviewsReceived: {
        where: { isRevealed: true },
        select: {
          ratingOverall: true, ratingTeaching: true, ratingCommunication: true,
          ratingPunctuality: true, feedback: true, createdAt: true,
          reviewer: { select: { name: true, avatarUrl: true } },
        },
      },
      activeMatchesAsUser1: { where: { isActive: true }, select: { id: true } },
      activeMatchesAsUser2: { where: { isActive: true }, select: { id: true } },
    },
  });
  if (!user) return apiError(res, 404, 'User not found');

  const avgRating = user.reviewsReceived.length
    ? user.reviewsReceived.reduce((s, r) => s + r.ratingOverall, 0) / user.reviewsReceived.length
    : 0;

  const completedSwaps = await prisma.matchRequest.count({
    where: {
      status: 'COMPLETED',
      OR: [{ senderId: user.id }, { receiverId: user.id }],
    },
  });

  return apiSuccess(res, {
    profile: {
      ...user,
      skills: user.skills.map((s) => ({ ...s, tags: s.tags.map((t) => t.tag.name) })),
      stats: {
        activeMatches: user.activeMatchesAsUser1.length + user.activeMatchesAsUser2.length,
        completedSwaps,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: user.reviewsReceived.length,
      },
    },
  });
});

router.patch('/me', authenticate, validate(profileUpdateSchema), async (req, res) => {
  const data = {};
  if (req.body.name) data.name = sanitizeString(req.body.name);
  if (req.body.headline !== undefined) data.headline = sanitizeString(req.body.headline);
  if (req.body.bio !== undefined) data.bio = sanitizeString(req.body.bio);
  if (req.body.location !== undefined) data.location = sanitizeString(req.body.location);
  if (req.body.linkedinUrl !== undefined) data.linkedinUrl = req.body.linkedinUrl;
  if (req.body.githubUrl !== undefined) data.githubUrl = req.body.githubUrl;
  if (req.body.portfolioUrl !== undefined) data.portfolioUrl = req.body.portfolioUrl;
  if (req.body.timezone) data.timezone = req.body.timezone;
  if (req.body.availabilityStatus) data.availabilityStatus = req.body.availabilityStatus;
  if (req.body.notifyMatches !== undefined) data.notifyMatches = req.body.notifyMatches;
  if (req.body.notifyMessages !== undefined) data.notifyMessages = req.body.notifyMessages;
  if (req.body.notifySessions !== undefined) data.notifySessions = req.body.notifySessions;

  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  return apiSuccess(res, { user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
});

router.post('/me/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  if (!req.file) return apiError(res, 400, 'No image provided');
  try {
    let avatarUrl;
    const result = await uploadImage(req.file.buffer, 'skillswap/avatars');
    
    if (result && result.secure_url) {
      avatarUrl = result.secure_url;
    } else {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = uniqueSuffix + '-' + req.file.originalname;
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
      avatarUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${filename}`;
    }
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl }
    });
    
    return apiSuccess(res, { user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return apiError(res, 500, 'Image upload failed');
  }
});

router.patch('/me/password', authenticate, validate(passwordUpdateSchema), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
  if (!valid) return apiError(res, 401, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
  return apiSuccess(res, { message: 'Password updated' });
});

router.delete('/me', authenticate, async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { deletedAt: new Date(), email: `deleted_${req.user.id}@removed.local` },
  });
  return apiSuccess(res, { message: 'Account deleted' });
});

export default router;
