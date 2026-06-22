import Pusher from 'pusher';

let pusher = null;

export function initPusher() {
  if (process.env.PUSHER_APP_ID) {
    pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER || 'us2',
      useTLS: true,
    });
  }
}

export function getPusher() {
  return pusher;
}

export async function triggerEvent(channel, event, data) {
  if (pusher) await pusher.trigger(channel, event, data);
}
