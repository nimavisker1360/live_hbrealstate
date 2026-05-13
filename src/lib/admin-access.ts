import { getCurrentSession } from "@/lib/auth";
import { getSessionBackedByDatabase } from "@/lib/auth-users";
import { jsonError } from "@/lib/api";

export async function getAdminUserOrResponse() {
  const session = await getCurrentSession().catch(() => null);

  if (!session) {
    return { response: jsonError("Authentication required.", 401) };
  }

  const user = await getSessionBackedByDatabase(session).catch(() => null);

  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") {
    return { response: jsonError("Admin access required.", 403) };
  }

  return { user };
}
