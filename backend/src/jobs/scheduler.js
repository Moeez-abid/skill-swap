import { prisma } from '../lib/prisma.js';

export async function completePastSessions() {
  const now = new Date();
  await prisma.session.updateMany({
    where: {
      scheduledEnd: { lt: now },
      status: 'ACCEPTED',
    },
    data: { status: 'COMPLETED' },
  });
}

export async function expirePendingRequests() {
  const now = new Date();
  await prisma.matchRequest.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
    },
    data: { status: 'EXPIRED' },
  });
}

export async function cancelExpiredProposedSessions() {
  const now = new Date();
  await prisma.session.updateMany({
    where: {
      status: 'PROPOSED',
      scheduledStart: { lt: now },
    },
    data: { status: 'CANCELLED' },
  });
}

export function startScheduledJobs() {
  setInterval(async () => {
    try {
      await completePastSessions();
      await expirePendingRequests();
      await cancelExpiredProposedSessions();
    } catch (err) {
      console.error('Scheduled job error:', err.message);
    }
  }, 60 * 1000);
}
