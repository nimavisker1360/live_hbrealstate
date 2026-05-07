import { getCurrentSession } from "@/lib/auth";
import { getSessionBackedByDatabase } from "@/lib/auth-users";
import { jsonError } from "@/lib/api";

export async function getRecordingDashboardUser() {
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
