import type { AuthSession } from "@/lib/auth";

const DEFAULT_DASHBOARD_EMAIL = "f4rz4mkaram@gmail.com";

function readEmailList(value?: string) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function getAgentDashboardEmails() {
  const configured = readEmailList(process.env.HB_AGENT_DASHBOARD_EMAILS);

  return configured.length > 0 ? configured : [DEFAULT_DASHBOARD_EMAIL];
}

export function canAccessAgentDashboard(
  session: Pick<AuthSession, "email"> | null | undefined,
) {
  const email = session?.email?.trim().toLowerCase();

  return Boolean(email && getAgentDashboardEmails().includes(email));
}
