import { getCurrentSession } from "@/lib/auth";
import { getSessionBackedByDatabase } from "@/lib/auth-users";
import { jsonError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function getWritableSession() {
  const session = await getCurrentSession().catch(() => null);

  if (!session) {
    return { response: jsonError("Authentication required.", 401) };
  }

  const user = await getSessionBackedByDatabase(session);

  if (user.role === "BUYER") {
    return { response: jsonError("Unauthorized.", 403) };
  }

  return { user };
}

export async function GET() {
  try {
    const writable = await getWritableSession();

    if (writable.response) {
      return writable.response;
    }

    const [liveSessions, properties] = await Promise.all([
      prisma.liveSession.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          roomId: true,
          startsAt: true,
          status: true,
          title: true,
          property: {
            select: {
              id: true,
              location: true,
              title: true,
            },
          },
        },
      }),
      prisma.property.findMany({
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          location: true,
          title: true,
        },
      }),
    ]);

    return Response.json({
      data: {
        liveSessions: liveSessions.map((session) => ({
          id: session.id,
          propertyId: session.property.id,
          roomId: session.roomId,
          startsAt: session.startsAt?.toISOString() ?? null,
          status: session.status,
          title: session.title,
          propertyTitle: session.property.title,
          propertyLocation: session.property.location,
        })),
        properties,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
