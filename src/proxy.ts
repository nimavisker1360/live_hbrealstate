import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  type AuthRole,
  verifySessionToken,
} from "@/lib/auth";
import { canAccessAgentDashboard } from "@/lib/agent-dashboard-access";

const PAGE_ACCESS: Array<{
  agentDashboardOnly?: boolean;
  prefix: string;
  roles: AuthRole[];
}> = [
  { prefix: "/admin", roles: ["OWNER"] },
  { agentDashboardOnly: true, prefix: "/agent", roles: ["OWNER", "AGENT"] },
  { agentDashboardOnly: true, prefix: "/dashboard", roles: ["OWNER", "AGENT"] },
];

const API_ACCESS: Array<{
  methods?: string[];
  prefix: string;
  roles: AuthRole[];
}> = [
  { methods: ["GET"], prefix: "/api/leads", roles: ["OWNER", "AGENT"] },
  { methods: ["GET"], prefix: "/api/offers", roles: ["OWNER", "AGENT"] },
];

function findAccessRule(pathname: string, method: string) {
  const apiRule = API_ACCESS.find(
    (rule) =>
      pathname.startsWith(rule.prefix) &&
      (!rule.methods || rule.methods.includes(method)),
  );

  if (apiRule) {
    return apiRule;
  }

  return PAGE_ACCESS.find((rule) => pathname.startsWith(rule.prefix));
}

function loginRedirect(request: NextRequest) {
  const loginUrl = new URL(
    process.env.HB_MAIN_LOGIN_URL ?? "https://hbrealstate.com/login",
  );
  const callbackUrl = new URL("/api/auth/sso", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  callbackUrl.searchParams.set("next", nextPath);
  loginUrl.searchParams.set("callbackUrl", callbackUrl.toString());

  return NextResponse.redirect(loginUrl);
}

function unauthorizedResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { message: "Unauthorized." } },
      { status: 403 },
    );
  }

  const response = NextResponse.rewrite(
    new URL("/__dashboard-not-found", request.url),
  );
  response.cookies.delete(AUTH_COOKIE_NAME);

  return response;
}

function unauthenticatedResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { message: "Authentication required." } },
      { status: 401 },
    );
  }

  return loginRedirect(request);
}

export async function proxy(request: NextRequest) {
  const rule = findAccessRule(request.nextUrl.pathname, request.method);

  if (!rule) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    return unauthenticatedResponse(request);
  }

  if (!rule.roles.includes(session.role)) {
    return unauthorizedResponse(request);
  }

  if (
    "agentDashboardOnly" in rule &&
    rule.agentDashboardOnly &&
    !canAccessAgentDashboard(session)
  ) {
    return unauthorizedResponse(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/agent/:path*",
    "/dashboard/:path*",
    "/api/leads/:path*",
    "/api/offers/:path*",
  ],
};
