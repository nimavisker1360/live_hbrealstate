import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  type AuthRole,
  createSessionToken,
  normalizeRole,
  sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";

function safeNextUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const nextValue = requestUrl.searchParams.get("next");

  if (!nextValue) {
    return new URL("/live", requestUrl);
  }

  try {
    const nextUrl = new URL(nextValue, requestUrl);

    if (nextUrl.origin !== requestUrl.origin) {
      return new URL("/live", requestUrl);
    }

    return nextUrl;
  } catch {
    return new URL("/live", requestUrl);
  }
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: { message: "Dev login is disabled in production." } },
      { status: 404 },
    );
  }

  const requestUrl = new URL(request.url);
  const role = normalizeRole(requestUrl.searchParams.get("role") ?? "AGENT");
  const userByRole: Record<AuthRole, { email: string; name: string; sub: string }> = {
    AGENT: {
      email: "dev-agent@local.test",
      name: "Dev Agent",
      sub: "dev-agent",
    },
    BUYER: {
      email: "dev-buyer@local.test",
      name: "Dev Buyer",
      sub: "dev-buyer",
    },
    OWNER: {
      email: "dev-owner@local.test",
      name: "Dev Owner",
      sub: "dev-owner",
    },
  };
  const user = userByRole[role];
  const token = await createSessionToken({
    sub: user.sub,
    name: user.name,
    email: user.email,
    role,
  });
  const response = NextResponse.redirect(safeNextUrl(request));

  response.cookies.set(AUTH_COOKIE_NAME, token, sessionCookieOptions);

  return response;
}
