"use client";

import Pusher from "pusher-js";

export function createPusherClient(visitorId: string) {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    return null;
  }

  return new Pusher(key, {
    cluster,
    channelAuthorization: {
      endpoint: "/api/pusher/auth",
      paramsProvider: () => ({ visitorId }),
      transport: "ajax",
    },
  });
}
