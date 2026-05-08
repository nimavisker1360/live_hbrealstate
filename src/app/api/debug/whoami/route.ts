import { getCurrentSession } from "@/lib/auth";
import { getSessionBackedByDatabase } from "@/lib/auth-users";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession().catch(() => null);
  const persisted = session
    ? await getSessionBackedByDatabase(session).catch(() => null)
    : null;
  const linkedAgent = persisted
    ? await prisma.agent.findUnique({
        where: { userId: persisted.sub },
        select: { id: true, name: true },
      })
    : null;

  return Response.json({
    sessionFromCookie: session
      ? {
          sub: session.sub,
          email: session.email,
          name: session.name,
          role: session.role,
        }
      : null,
    persistedFromDb: persisted,
    linkedAgent,
  });
}
