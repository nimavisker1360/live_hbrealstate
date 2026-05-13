import type { AuthSession } from "@/lib/auth";

export const AGENT_DASHBOARD_EMAIL = "f4rz4mkaram@gmail.com";

export function getAgentDashboardEmails() {
  return [AGENT_DASHBOARD_EMAIL];
}

export function isAgentDashboardEmail(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase();

  return normalizedEmail
    ? getAgentDashboardEmails().includes(normalizedEmail)
    : false;
}

export function canAccessAgentDashboard(
  session:
    | Pick<AuthSession, "role" | "status">
    | null
    | undefined,
) {
  return (
    session?.status === "ACTIVE" &&
    (session.role === "ADMIN" || session.role === "AGENT")
  );
}
