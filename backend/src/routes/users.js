import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validate, profileUpdateSchema, passwordUpdateSchema } from '../middleware/validate.js';
import { apiError, apiSuccess, sanitizeString } from '../utils/helpers.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { uploadImage } from '../lib/cloudinary.js';
import { sendEmail } from '../lib/email.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.get('/', authenticate, async (req, res) => {
  const usersList = await prisma.user.findMany({
    where: { id: { not: req.user.id }, deletedAt: null, isBanned: false },
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: 'asc' }
  });
  return apiSuccess(res, { users: usersList });
});

router.get('/:id/profile', async (req, res) => {
  const [user, completedSwaps] = await Promise.all([
    prisma.user.findFirst({
      where: { id: req.params.id, deletedAt: null, isBanned: false },
      select: {
        id: true, name: true, headline: true, bio: true, location: true, avatarUrl: true,
        linkedinUrl: true, githubUrl: true, portfolioUrl: true,
        availabilityStatus: true, createdAt: true, isVerified: true, verificationRequested: true,
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
    }),
    prisma.matchRequest.count({
      where: {
        status: 'COMPLETED',
        OR: [{ senderId: req.params.id }, { receiverId: req.params.id }],
      },
    })
  ]);

  if (!user) return apiError(res, 404, 'User not found');

  const avgRating = user.reviewsReceived.length
    ? user.reviewsReceived.reduce((s, r) => s + r.ratingOverall, 0) / user.reviewsReceived.length
    : 0;

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
  if (req.body.emailNotifyMatches !== undefined) data.emailNotifyMatches = req.body.emailNotifyMatches;
  if (req.body.emailNotifyMessages !== undefined) data.emailNotifyMessages = req.body.emailNotifyMessages;
  if (req.body.emailNotifySessions !== undefined) data.emailNotifySessions = req.body.emailNotifySessions;

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

// Link Google account to profile
router.post('/me/link-google', authenticate, async (req, res) => {
  const { credential } = req.body;
  if (!credential) return apiError(res, 400, 'Missing credential');

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return apiError(res, 400, 'Invalid Google token');

    const googleId = payload.sub;

    // Check if googleId is already linked to another user
    const existing = await prisma.user.findFirst({
      where: {
        googleId,
        id: { not: req.user.id }
      }
    });
    if (existing) {
      return apiError(res, 400, 'This Google account is already linked to another profile');
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { googleId }
    });

    return apiSuccess(res, {
      message: 'Google account linked successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        googleId: updatedUser.googleId,
        phoneVerified: updatedUser.phoneVerified
      }
    });
  } catch (error) {
    console.error('Link Google Error:', error);
    return apiError(res, 401, 'Google account link failed');
  }
});

// Send OTP to Google email account
router.post('/me/send-email-otp', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user.googleId) {
    return apiError(res, 400, 'Please link your Google account first');
  }

  // Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      emailOtp: otp,
      emailOtpExpires: expires
    }
  });

  const mailSent = await sendEmail({
    to: user.email,
    subject: 'SkillSwap Email Verification OTP',
    html: `<p>Your verification code is: <strong>${otp}</strong>. This code will expire in 10 minutes.</p>`
  });

  // For testing, print to console as well
  console.log(`[TESTING OTP] Email verification code for ${user.email} is: ${otp}`);

  return apiSuccess(res, {
    message: 'Verification OTP sent to email',
    otp: !mailSent ? otp : undefined
  });
});

// Verify email OTP
router.post('/me/verify-email-otp', authenticate, async (req, res) => {
  const { otp } = req.body;
  if (!otp) return apiError(res, 400, 'OTP is required');

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user.emailOtp || !user.emailOtpExpires || user.emailOtpExpires < new Date()) {
    return apiError(res, 400, 'OTP has expired or does not exist. Please request a new one.');
  }

  if (user.emailOtp !== otp.trim()) {
    return apiError(res, 400, 'Invalid OTP code');
  }

  // Verify and clean up
  const isVerifiedNow = user.phoneVerified;

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      emailOtp: null,
      emailOtpExpires: null,
      isVerified: isVerifiedNow
    }
  });

  return apiSuccess(res, {
    message: 'Email verified successfully',
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isVerified: updated.isVerified,
      googleId: updated.googleId,
      phoneVerified: updated.phoneVerified
    }
  });
});

// Send SMS OTP to phone number
router.post('/me/send-phone-otp', authenticate, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return apiError(res, 400, 'Phone number is required');

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      phoneOtp: otp,
      phoneOtpExpires: expires,
      phone: phone.trim()
    }
  });

  // Log to console to simulate Twilio/SMS gateway
  console.log(`[TESTING OTP] SMS verification code to ${phone} is: ${otp}`);

  return apiSuccess(res, {
    message: 'SMS OTP sent successfully',
    otp
  });
});

// Verify phone OTP
router.post('/me/verify-phone-otp', authenticate, async (req, res) => {
  const { otp } = req.body;
  if (!otp) return apiError(res, 400, 'OTP is required');

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user.phoneOtp || !user.phoneOtpExpires || user.phoneOtpExpires < new Date()) {
    return apiError(res, 400, 'OTP has expired or does not exist. Please request a new one.');
  }

  if (user.phoneOtp !== otp.trim()) {
    return apiError(res, 400, 'Invalid OTP code');
  }

  const isVerifiedNow = !!user.googleId;

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      phoneOtp: null,
      phoneOtpExpires: null,
      phoneVerified: true,
      isVerified: isVerifiedNow
    }
  });

  return apiSuccess(res, {
    message: 'Phone verified successfully',
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isVerified: updated.isVerified,
      googleId: updated.googleId,
      phoneVerified: updated.phoneVerified
    }
  });
});

router.post('/:id/block', authenticate, async (req, res) => {
  if (req.user.id === req.params.id) {
    return apiError(res, 400, 'You cannot block yourself');
  }

  const { reason } = req.body;
  try {
    const block = await prisma.block.create({
      data: {
        blockerId: req.user.id,
        blockedId: req.params.id,
        reason: reason || null,
      }
    });
    return apiSuccess(res, { block, message: 'User blocked successfully' });
  } catch (err) {
    if (err.code === 'P2002') return apiError(res, 400, 'User is already blocked');
    console.error(err);
    return apiError(res, 500, 'Failed to block user');
  }
});

router.post('/:id/flag', authenticate, async (req, res) => {
  if (req.user.id === req.params.id) {
    return apiError(res, 400, 'You cannot report yourself');
  }

  const { reason, description } = req.body;
  if (!reason) return apiError(res, 400, 'Reason is required');

  try {
    const flag = await prisma.flag.create({
      data: {
        reporterId: req.user.id,
        targetType: 'USER',
        targetId: req.params.id,
        reason,
        description: description || null,
      }
    });
    return apiSuccess(res, { flag, message: 'User reported successfully' });
  } catch (err) {
    console.error(err);
    return apiError(res, 500, 'Failed to report user');
  }
});

export default router;
