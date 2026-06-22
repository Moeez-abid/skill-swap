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
      role: 'ADMIN',
      bio: 'SkillSwap platform administrator.',
      location: 'Remote',
    },
  });

  const users = [];
  const names = ['Alex Chen', 'Jordan Lee', 'Sam Rivera', 'Taylor Kim', 'Morgan Blake', 'Casey Wong'];
  for (let i = 0; i < names.length; i++) {
    const user = await prisma.user.upsert({
      where: { email: `user${i + 1}@skillswap.io` },
      update: {},
      create: {
        email: `user${i + 1}@skillswap.io`,
        passwordHash,
        name: names[i],
        bio: `Passionate learner and teacher. Happy to swap skills!`,
        location: ['New York', 'London', 'Toronto', 'Berlin', 'Sydney', 'Tokyo'][i],
        timezone: 'UTC',
      },
    });
    users.push(user);
  }

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

  const allCategories = await prisma.category.findMany({ include: { subcategories: true } });
  const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
  const skillTitles = [
    'React & Modern Frontend', 'Python for Data Analysis', 'Digital Photography Basics',
    'Conversational Spanish', 'UI/UX Design Fundamentals', 'Public Speaking Mastery',
    'Yoga for Beginners', 'Home Cooking Essentials', 'Git & GitHub Workflow',
    'Content Marketing Strategy', 'Piano for Beginners', 'Personal Finance 101',
    'Node.js Backend APIs', 'Watercolor Painting', 'French Conversation',
    'Project Management', 'Meditation & Mindfulness', 'Woodworking Basics',
  ];

  for (let i = 0; i < skillTitles.length; i++) {
    const cat = allCategories[i % allCategories.length];
    const sub = cat.subcategories[i % cat.subcategories.length];
    const provider = users[i % users.length];

    const skill = await prisma.skill.create({
      data: {
        title: skillTitles[i],
        level: levels[i % 3],
        shortDescription: `Learn ${skillTitles[i]} through hands-on peer sessions and practical exercises.`,
        fullDescription: `This skill swap offering covers ${skillTitles[i]} in depth. You'll work through structured lessons, get personalized feedback, and practice with a dedicated partner. No money involved — just a fair exchange of knowledge and time.`,
        learningOutcomes: 'Core concepts, practical projects, and confidence to teach others.',
        sessionDurations: [30, 60],
        providerId: provider.id,
        categoryId: cat.id,
        subcategoryId: sub.id,
        requestCount: Math.floor(Math.random() * 50) + 5,
        avgRating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(Math.random() * 20),
        isFeatured: i < 8,
      },
    });

    const tagNames = ['popular', 'beginner-friendly', 'hands-on'].slice(0, (i % 3) + 1);
    for (const name of tagNames) {
      const tag = await prisma.tag.upsert({ where: { name }, create: { name }, update: {} });
      await prisma.skillTag.create({ data: { skillId: skill.id, tagId: tag.id } });
    }
  }

  console.log('Seed complete.');
  console.log('Admin: admin@skillswap.io / Password123!');
  console.log('Users: user1@skillswap.io – user6@skillswap.io / Password123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
