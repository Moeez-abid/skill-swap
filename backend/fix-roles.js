import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: { role: 'USER' }
  });
  console.log('Fixed old admin roles');
}
main().catch(console.error).finally(() => prisma.$disconnect());
