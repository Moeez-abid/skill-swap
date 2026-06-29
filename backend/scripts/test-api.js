import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { verificationRequested: true, isVerified: false, deletedAt: null },
    select: { id: true, name: true, email: true, createdAt: true, portfolioUrl: true, linkedinUrl: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(users);
}
main().finally(() => prisma.$disconnect());
