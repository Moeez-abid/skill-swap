import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { uploadImage } from '../lib/cloudinary.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate, skillSchema } from '../middleware/validate.js';
import { apiError, apiSuccess, paginate, sanitizeString } from '../utils/helpers.js';
import fs from 'fs';
import path from 'path';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const skillInclude = {
  provider: { select: { id: true, name: true, avatarUrl: true, location: true, availabilityStatus: true } },
  category: { select: { id: true, name: true, slug: true } },
  subcategory: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: true } },
  schedules: true,
};

function buildSkillWhere(query) {
  const where = { 
    isDeleted: false,
    provider: { deletedAt: null, isBanned: false } 
  };
  if (query.provider) where.providerId = query.provider;
  if (query.excludeProvider) where.providerId = { not: query.excludeProvider };
  if (query.category) where.category = { slug: query.category };
  if (query.categories) {
    const slugs = String(query.categories).split(',');
    where.category = { slug: { in: slugs } };
  }
  if (query.level) where.level = query.level.toUpperCase();
  if (query.levels) {
    where.level = { in: String(query.levels).split(',').map((l) => l.toUpperCase()) };
  }
  if (query.availability) where.availability = query.availability.toUpperCase();
  if (query.location) where.provider = { ...where.provider, location: { contains: query.location, mode: 'insensitive' } };
  if (query.minRating) where.avgRating = { gte: parseFloat(query.minRating) };
  if (query.q) {
    const q = sanitizeString(query.q);
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { shortDescription: { contains: q, mode: 'insensitive' } },
      { fullDescription: { contains: q, mode: 'insensitive' } },
      { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
    ];
  }
  return where;
}

function buildSkillOrder(sort) {
  switch (sort) {
    case 'popular': return { requestCount: 'desc' };
    case 'rating': return { avgRating: 'desc' };
    case 'alpha': return { title: 'asc' };
    default: return { createdAt: 'desc' };
  }
}

router.get('/', optionalAuth, async (req, res) => {
  const { page, limit, skip, take } = paginate(req.query.page, req.query.limit);
  const where = buildSkillWhere(req.query);
  const orderBy = buildSkillOrder(req.query.sort);

  const [skills, total] = await Promise.all([
    prisma.skill.findMany({ where, orderBy, skip, take, include: skillInclude }),
    prisma.skill.count({ where }),
  ]);

  return apiSuccess(res, {
    skills: skills.map(formatSkill),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

router.get('/featured', optionalAuth, async (req, res) => {
  const where = { provider: { deletedAt: null, isBanned: false } };
  if (req.user) {
    where.providerId = { not: req.user.id };
  }
  
  const skills = await prisma.skill.findMany({
    where,
    orderBy: { requestCount: 'desc' },
    take: 8,
    include: skillInclude,
  });
  return apiSuccess(res, { skills: skills.map(formatSkill) });
});

router.get('/:id', optionalAuth, async (req, res) => {
  const skill = await prisma.skill.findUnique({
    where: { id: req.params.id },
    include: skillInclude,
  });
  if (!skill) return apiError(res, 404, 'Skill not found');

  await prisma.skill.update({
    where: { id: skill.id },
    data: { viewCount: { increment: 1 } },
  });

  return apiSuccess(res, { skill: formatSkill(skill) });
});

router.post('/', authenticate, upload.single('coverImage'), async (req, res) => {
  const body = { ...req.body };
  body.sessionDurations = [];
  if (typeof body.tags === 'string') {
    try { body.tags = JSON.parse(body.tags); } catch { body.tags = body.tags.split(',').map((t) => t.trim()).filter(Boolean); }
  }
  if (typeof body.schedules === 'string') {
    try { body.schedules = JSON.parse(body.schedules); } catch { body.schedules = undefined; }
  }

  const parsed = skillSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }
  const data = parsed.data;
  let coverImageUrl = null;

  if (req.file) {
    const result = await uploadImage(req.file.buffer);
    if (result && result.secure_url) {
      coverImageUrl = result.secure_url;
    } else {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = uniqueSuffix + '-' + req.file.originalname;
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
      coverImageUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${filename}`;
    }
  }

  const tagRecords = await upsertTags(data.tags || []);

  const skill = await prisma.skill.create({
    data: {
      title: sanitizeString(data.title),
      level: data.level,
      shortDescription: sanitizeString(data.shortDescription),
      fullDescription: sanitizeString(data.fullDescription),
      learningOutcomes: sanitizeString(data.learningOutcomes),
      prerequisites: data.prerequisites ? sanitizeString(data.prerequisites) : null,
      sessionDurations: data.sessionDurations,
      coverImageUrl,
      availability: data.availability || 'AVAILABLE',
      providerId: req.user.id,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      tags: { create: tagRecords.map((tagId) => ({ tagId })) },
      schedules: data.schedules?.length
        ? { create: data.schedules }
        : undefined,
    },
    include: skillInclude,
  });

  return apiSuccess(res, { skill: formatSkill(skill) }, 201);
});

async function upsertTags(names) {
  const ids = [];
  for (const name of names.slice(0, 10)) {
    const clean = sanitizeString(name).toLowerCase();
    if (!clean) continue;
    const tag = await prisma.tag.upsert({
      where: { name: clean },
      create: { name: clean },
      update: {},
    });
    ids.push(tag.id);
  }
  return ids;
}

function formatSkill(skill) {
  return {
    ...skill,
    tags: skill.tags?.map((st) => st.tag.name) || [],
  };
}

router.patch('/:id', authenticate, upload.single('coverImage'), async (req, res) => {
  const existingSkill = await prisma.skill.findUnique({
    where: { id: req.params.id },
    include: { tags: true }
  });

  if (!existingSkill) return apiError(res, 404, 'Skill not found');
  if (existingSkill.providerId !== req.user.id) return apiError(res, 403, 'You can only edit your own skills');

  const body = { ...req.body };
  
  if (body.tags && typeof body.tags === 'string') {
    try { body.tags = JSON.parse(body.tags); } catch { body.tags = body.tags.split(',').map((t) => t.trim()).filter(Boolean); }
  }
  if (body.schedules && typeof body.schedules === 'string') {
    try { body.schedules = JSON.parse(body.schedules); } catch { body.schedules = undefined; }
  }
  if (body.sessionDurations && typeof body.sessionDurations === 'string') {
    try { body.sessionDurations = JSON.parse(body.sessionDurations); } catch { body.sessionDurations = undefined; }
  }

  // Use partial schema validation for updates if needed, or simply let the DB handle constraints
  let coverImageUrl = existingSkill.coverImageUrl;

  if (req.file) {
    const result = await uploadImage(req.file.buffer);
    if (result && result.secure_url) {
      coverImageUrl = result.secure_url;
    } else {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = uniqueSuffix + '-' + req.file.originalname;
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
      coverImageUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${filename}`;
    }
  }

  let tagsUpdate = undefined;
  if (body.tags && Array.isArray(body.tags)) {
    const tagRecords = await upsertTags(body.tags);
    // Delete existing connections
    await prisma.skillTag.deleteMany({ where: { skillId: existingSkill.id } });
    tagsUpdate = { create: tagRecords.map((tagId) => ({ tagId })) };
  }

  const updateData = {};
  if (body.title) updateData.title = sanitizeString(body.title);
  if (body.level) updateData.level = body.level;
  if (body.shortDescription) updateData.shortDescription = sanitizeString(body.shortDescription);
  if (body.fullDescription) updateData.fullDescription = sanitizeString(body.fullDescription);
  if (body.learningOutcomes) updateData.learningOutcomes = sanitizeString(body.learningOutcomes);
  if (body.prerequisites !== undefined) updateData.prerequisites = body.prerequisites ? sanitizeString(body.prerequisites) : null;
  if (body.sessionDurations) updateData.sessionDurations = body.sessionDurations;
  if (body.availability) updateData.availability = body.availability;
  if (body.categoryId) updateData.categoryId = body.categoryId;
  if (body.subcategoryId) updateData.subcategoryId = body.subcategoryId;
  if (coverImageUrl !== existingSkill.coverImageUrl) updateData.coverImageUrl = coverImageUrl;
  if (tagsUpdate) updateData.tags = tagsUpdate;

  // For simplicity, we are not updating schedules in PATCH. To update schedules, it would be complex (delete/recreate)
  // so we'll leave that out of the MVP edit or add it later if required.

  const updatedSkill = await prisma.skill.update({
    where: { id: existingSkill.id },
    data: updateData,
    include: skillInclude
  });

  return apiSuccess(res, { skill: formatSkill(updatedSkill) });
});

router.delete('/:id', authenticate, async (req, res) => {
  const existingSkill = await prisma.skill.findUnique({
    where: { id: req.params.id },
    include: {
      offeredInRequests: { select: { id: true }, take: 1 },
      wantedInRequests: { select: { id: true }, take: 1 }
    }
  });

  if (!existingSkill) return apiError(res, 404, 'Skill not found');
  if (existingSkill.providerId !== req.user.id) return apiError(res, 403, 'You can only delete your own skills');

  const isInUse = existingSkill.offeredInRequests.length > 0 || existingSkill.wantedInRequests.length > 0;

  if (isInUse) {
    await prisma.skill.update({
      where: { id: existingSkill.id },
      data: { isDeleted: true }
    });
  } else {
    await prisma.skill.delete({
      where: { id: existingSkill.id }
    });
  }

  return apiSuccess(res, { message: 'Skill deleted successfully' });
});

export default router;
