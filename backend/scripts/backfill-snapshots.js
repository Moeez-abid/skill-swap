import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillSnapshots() {
  console.log('Starting backfill of snapshots...');
  
  const allRequests = await prisma.matchRequest.findMany({
    include: {
      offeredSkill: true,
      wantedSkill: true
    }
  });

  const matchRequests = allRequests.filter(mr => !mr.offeredSkillSnapshot || !mr.wantedSkillSnapshot);

  console.log(`Found ${matchRequests.length} match requests to backfill.`);

  for (const mr of matchRequests) {
    await prisma.matchRequest.update({
      where: { id: mr.id },
      data: {
        offeredSkillSnapshot: mr.offeredSkill,
        wantedSkillSnapshot: mr.wantedSkill
      }
    });
  }

  console.log('Backfill complete!');
  await prisma.$disconnect();
}

backfillSnapshots().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
