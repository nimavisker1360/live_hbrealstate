import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

function safeNextUrl(request: Request, nextValue?: string | null) {
  const requestUrl = new URL(request.url);

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
  const requestUrl = new URL(request.url);
  const nextUrl = safeNextUrl(request, requestUrl.searchParams.get("next"));
  const forceLogin = requestUrl.searchParams.get("force") === "true";

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEV_AUTH_LOGIN === "true"
  ) {
    const devLoginUrl = new URL("/api/auth/dev-login", requestUrl);

    devLoginUrl.searchParams.set(
      "next",
      `${nextUrl.pathname}${nextUrl.search}`,
    );

    return NextResponse.redirect(devLoginUrl);
  }

  const cookieStore = await cookies();
  const session = await verifySessionToken(
    cookieStore.get(AUTH_COOKIE_NAME)?.value,
  ).catch(() => null);

  if (session && !forceLogin) {
    return NextResponse.redirect(nextUrl);
  }

  const loginUrl = new URL(
    process.env.HB_MAIN_LOGIN_URL ?? "https://hbrealstate.com/login",
  );
  const callbackUrl = new URL("/api/auth/sso", requestUrl);

  callbackUrl.searchParams.set("next", `${nextUrl.pathname}${nextUrl.search}`);
  loginUrl.searchParams.set("callbackUrl", callbackUrl.toString());

  const response = NextResponse.redirect(loginUrl);

  if (forceLogin) {
    response.cookies.delete(AUTH_COOKIE_NAME);
  }

  return response;
}
