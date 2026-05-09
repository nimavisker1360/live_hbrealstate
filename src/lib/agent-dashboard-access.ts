import type { AuthSession } from "@/lib/auth";

export const AGENT_DASHBOARD_EMAIL = "f4rz4mkaram@gmail.com";

export function getAgentDashboardEmails() {
  return [AGENT_DASHBOARD_EMAIL];
}

export function canAccessAgentDashboard(
  session: Pick<AuthSession, "email"> | null | undefined,
) {
  const email = session?.email?.trim().toLowerCase();

  return email === AGENT_DASHBOARD_EMAIL;
}
