import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

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

function clearAuthCookie(response: NextResponse) {
  response.cookies.delete(AUTH_COOKIE_NAME);

  return response;
}

export async function GET(request: Request) {
  return clearAuthCookie(NextResponse.redirect(safeNextUrl(request)));
}

export async function POST() {
  const response = NextResponse.json({ data: { ok: true } });

  return clearAuthCookie(response);
}
