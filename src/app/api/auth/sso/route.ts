import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  sessionCookieOptions,
  verifyMainSiteToken,
} from "@/lib/auth";
import { syncAuthUser } from "@/lib/auth-users";

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

async function syncBuyerUser(user: {
  sub: string;
  name?: string;
  email?: string;
  phone?: string;
  role: "OWNER" | "AGENT" | "BUYER";
}) {
  try {
    await syncAuthUser(user);
  } catch (error) {
    console.error("Could not sync SSO user.", error);
  }
}

async function createSsoResponse(
  request: Request,
  token: string | null,
  nextValue?: string | null,
) {
  if (!token) {
    return NextResponse.json(
      { error: { message: "Missing SSO token." } },
      { status: 400 },
    );
  }

  const user = await verifyMainSiteToken(token);

  if (!user) {
    return NextResponse.json(
      { error: { message: "Invalid or expired SSO token." } },
      { status: 401 },
    );
  }

  await syncBuyerUser(user);

  const sessionToken = await createSessionToken(user);
  const response = NextResponse.redirect(safeNextUrl(request, nextValue));

  response.cookies.set(AUTH_COOKIE_NAME, sessionToken, sessionCookieOptions);

  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  return createSsoResponse(
    request,
    url.searchParams.get("token"),
    url.searchParams.get("next"),
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    token?: string;
    next?: string;
  };

  return createSsoResponse(request, body.token ?? null, body.next);
}
