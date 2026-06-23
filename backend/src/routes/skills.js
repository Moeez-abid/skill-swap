import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { uploadImage } from '../lib/cloudinary.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate, skillSchema } from '../middleware/validate.js';
import { apiError, apiSuccess, paginate, sanitizeString } from '../utils/helpers.js';

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
  const where = { provider: { deletedAt: null, isSuspended: false } };
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
  const where = { provider: { deletedAt: null, isSuspended: false } };
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
    coverImageUrl = result?.secure_url || null;
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

export default router;
