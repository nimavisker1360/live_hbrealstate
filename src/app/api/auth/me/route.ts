import { getCurrentSession } from "@/lib/auth";
import { getSessionBackedByDatabase } from "@/lib/auth-users";

export async function GET() {
  const session = await getCurrentSession();
  let resolvedSession = session;

  if (session) {
    try {
      const persistedUser = await getSessionBackedByDatabase(session);

      resolvedSession = {
        ...session,
        ...persistedUser,
      };
    } catch (error) {
      console.error("Could not load authenticated user from database.", error);
    }
  }

  return Response.json({
    data: {
      session: resolvedSession,
    },
  });
}
