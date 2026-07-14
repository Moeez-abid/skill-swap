import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up old admin accounts...');
  const email = 'admin@skillswap.com';
  // Generate a robust temporary password
  const tempPassword = 'SkillSwapAdmin123!';
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'SUPER_ADMIN',
      passwordHash,
      name: 'System Super Admin',
    },
    create: {
      email,
      passwordHash,
      name: 'System Super Admin',
      role: 'SUPER_ADMIN',
      timezone: 'UTC',
    },
  });

  console.log('✅ Super Admin account created successfully!');
  console.log('-------------------------------------------');
  console.log(`Email:    ${admin.email}`);
  console.log(`Password: ${tempPassword}`);
  console.log('-------------------------------------------');
  console.log('⚠️  IMPORTANT: Please change this password after logging in.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
