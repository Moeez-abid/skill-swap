import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const categories = [
  { name: 'Technology', slug: 'technology', icon: '💻', subcategories: ['Web Development', 'Mobile Apps', 'Data Science', 'DevOps'] },
  { name: 'Creative Arts', slug: 'creative-arts', icon: '🎨', subcategories: ['Graphic Design', 'Photography', 'Music', 'Writing'] },
  { name: 'Languages', slug: 'languages', icon: '🌍', subcategories: ['English', 'Spanish', 'French', 'Mandarin'] },
  { name: 'Business', slug: 'business', icon: '📊', subcategories: ['Marketing', 'Finance', 'Leadership', 'Entrepreneurship'] },
  { name: 'Health & Wellness', slug: 'health-wellness', icon: '🧘', subcategories: ['Yoga', 'Nutrition', 'Fitness', 'Mental Health'] },
  { name: 'Life Skills', slug: 'life-skills', icon: '🔧', subcategories: ['Cooking', 'Public Speaking', 'Time Management', 'DIY'] },
];

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@skillswap.io' },
    update: {},
    create: {
      email: 'admin@skillswap.io',
      passwordHash,
      name: 'Platform Admin',
      role: 'SUPER_ADMIN',
      bio: 'SkillSwap platform administrator.',
      location: 'Remote',
    },
  });

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { name: cat.name, slug: cat.slug, icon: cat.icon, sortOrder: i },
    });

    for (const sub of cat.subcategories) {
      const slug = sub.toLowerCase().replace(/\s+/g, '-');
      await prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: category.id, slug } },
        update: {},
        create: { name: sub, slug, categoryId: category.id },
      });
    }
  }

  console.log('Seed complete. Clean slate created.');
  console.log('Admin: admin@skillswap.io / Password123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
