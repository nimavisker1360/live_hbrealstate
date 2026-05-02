import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
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

  const token = await createSessionToken({
    sub: "dev-buyer",
    name: "Dev Buyer",
    email: "dev-buyer@local.test",
    role: "BUYER",
  });
  const response = NextResponse.redirect(safeNextUrl(request));

  response.cookies.set(AUTH_COOKIE_NAME, token, sessionCookieOptions);

  return response;
}
