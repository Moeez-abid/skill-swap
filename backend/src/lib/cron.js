import cron from 'node-cron';
import { prisma } from './prisma.js';
import { sendEmail } from './email.js';
import { triggerEvent } from './pusher.js';

// Run every 5 minutes
export const startCronJobs = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('🕒 Running session reminder cron job...');
      const now = new Date();
      // Look 60 minutes into the future
      const targetTime = new Date(now.getTime() + 60 * 60 * 1000); 

      // Find sessions that are accepted, start within the next 60 minutes, and haven't had a reminder sent
      const upcomingSessions = await prisma.session.findMany({
        where: {
          status: 'ACCEPTED',
          reminderSent: false,
          scheduledStart: {
            lte: targetTime, // Starts before or exactly at 60 mins from now
            gt: now,         // But hasn't started yet
          }
        },
        include: {
          activeMatch: {
            include: { user1: true, user2: true }
          }
        }
      });

      for (const session of upcomingSessions) {
        const { user1, user2 } = session.activeMatch;

        // Send Email & Pusher to User 1
        await notifyUser(user1, session, user2);
        // Send Email & Pusher to User 2
        await notifyUser(user2, session, user1);

        // Mark as sent
        await prisma.session.update({
          where: { id: session.id },
          data: { reminderSent: true }
        });
        console.log(`✅ Sent reminders for session ${session.id}`);
      }
    } catch (err) {
      console.error('❌ Error running session reminder cron job:', err);
    }
  });
};

async function notifyUser(user, session, partner) {
  // 1. Pusher In-App Notification
  let notification = null;
  if (user.notifySessions) {
    notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SESSION_REMINDER',
        title: 'Upcoming Session!',
        content: `Your session with ${partner.name} is starting in less than an hour!`,
        linkUrl: '/sessions',
      }
    });
    await triggerEvent(`user-${user.id}`, 'session-reminder', { session, notification });
  } else {
    await triggerEvent(`user-${user.id}`, 'session-reminder', { session });
  }

  // 2. Email Notification (if preferences allow)
  if (user.emailNotifySessions) {
    const timeString = new Date(session.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await sendEmail({
      to: user.email,
      subject: 'Upcoming Session Reminder',
      html: `<p>Hi <strong>${user.name}</strong>,</p>
             <p>This is a friendly reminder that your skill swap session with <strong>${partner.name}</strong> is starting soon!</p>
             <p><strong>Time:</strong> ${timeString}</p>
             <p><strong>Method:</strong> ${session.meetingMethod}</p>
             ${session.meetingDetails ? `<p><strong>Details/Link:</strong> ${session.meetingDetails}</p>` : ''}
             <br/>
             <p><a href="http://localhost:5173/sessions" style="display:inline-block;padding:10px 20px;background:#E92E20;color:#fff;text-decoration:none;border-radius:8px;">View Dashboard</a></p>`
    });
  }
}
