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
    return new URL("/reels", requestUrl);
  }

  try {
    const nextUrl = new URL(nextValue, requestUrl);

    if (nextUrl.origin !== requestUrl.origin) {
      return new URL("/reels", requestUrl);
    }

    return nextUrl;
  } catch {
    return new URL("/reels", requestUrl);
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
    ADMIN: {
      email: "dev-admin@local.test",
      name: "Dev Admin",
      sub: "dev-admin",
    },
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
  };
  const user = userByRole[role];
  const token = await createSessionToken({
    sub: user.sub,
    name: user.name,
    email: user.email,
    role,
    status: role === "BUYER" ? undefined : "ACTIVE",
  });
  const response = NextResponse.redirect(safeNextUrl(request));

  response.cookies.set(AUTH_COOKIE_NAME, token, sessionCookieOptions);

  return response;
}
