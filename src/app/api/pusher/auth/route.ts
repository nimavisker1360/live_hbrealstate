import { getLivePresenceChannel } from "@/lib/pusher-channels";
import { getPusherServer } from "@/lib/pusher-server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const pusher = getPusherServer();
  const session = await getCurrentSession().catch(() => null);

  if (!pusher) {
    return Response.json(
      { error: { message: "Pusher is not configured." } },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const socketId = String(formData.get("socket_id") ?? "");
  const channelName = String(formData.get("channel_name") ?? "");
  const visitorId = String(formData.get("visitorId") ?? "").trim();

  if (!socketId || !channelName) {
    return Response.json(
      { error: { message: "Missing Pusher auth parameters." } },
      { status: 400 },
    );
  }

  if (!channelName.startsWith("presence-live-")) {
    return Response.json(
      { error: { message: "Channel is not allowed." } },
      { status: 403 },
    );
  }

  const liveSessionId = channelName.replace("presence-live-", "");

  if (!liveSessionId || channelName !== getLivePresenceChannel(liveSessionId)) {
    return Response.json(
      { error: { message: "Invalid channel name." } },
      { status: 400 },
    );
  }

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: liveSessionId },
    select: { id: true },
  });

  if (!liveSession) {
    return Response.json(
      { error: { message: "Live session not found." } },
      { status: 404 },
    );
  }

  const auth = pusher.authorizeChannel(socketId, channelName, {
    user_id: (session?.sub ?? visitorId) || socketId,
    user_info: {
      name: session?.name ?? "Guest",
      role: session?.role ?? "BUYER",
      visitorId,
    },
  });

  return Response.json(auth);
}
