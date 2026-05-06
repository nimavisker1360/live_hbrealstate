import { NextResponse } from "next/server";
import { handleApiError, jsonError } from "@/lib/api";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  sessionCookieOptions,
  verifyLiveAuthToken,
} from "@/lib/auth";
import { syncExternalAuthUser } from "@/lib/auth-users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      token?: unknown;
    };
    const token =
      typeof body.token === "string" && body.token.trim()
        ? body.token.trim()
        : undefined;

    if (!token) {
      return jsonError("Invalid or expired auth token.", 401);
    }

    const authUser = await verifyLiveAuthToken(token);

    if (!authUser) {
      return jsonError("Invalid or expired auth token.", 401);
    }

    const user = await syncExternalAuthUser(authUser);
    const sessionToken = await createSessionToken({
      sub: user.id,
      name: user.name,
      email: user.email ?? undefined,
      role: "BUYER",
    });
    const response = NextResponse.json(user);

    response.cookies.set(AUTH_COOKIE_NAME, sessionToken, sessionCookieOptions);

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
