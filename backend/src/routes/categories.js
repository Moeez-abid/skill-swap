import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { apiSuccess } from '../utils/helpers.js';

const router = Router();

router.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { subcategories: { orderBy: { name: 'asc' } } },
  });
  return apiSuccess(res, { categories });
});

router.get('/:slug/subcategories', async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { slug: req.params.slug },
    include: { subcategories: { orderBy: { name: 'asc' } } },
  });
  if (!category) return res.status(404).json({ error: 'Category not found' });
  return apiSuccess(res, { subcategories: category.subcategories });
});

export default router;
