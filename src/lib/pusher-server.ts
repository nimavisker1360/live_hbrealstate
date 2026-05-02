import Pusher from "pusher";

let pusher: Pusher | null = null;

export function getPusherServer() {
  if (pusher) {
    return pusher;
  }

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    return null;
  }

  pusher = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusher;
}

export async function triggerRealtimeEvent(
  channel: string,
  event: string,
  payload: unknown,
) {
  const client = getPusherServer();

  if (!client) {
    return;
  }

  try {
    await client.trigger(channel, event, payload);
  } catch (error) {
    console.error("Pusher publish failed:", error);
  }
}

