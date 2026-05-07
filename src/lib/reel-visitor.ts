import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export const REEL_VISITOR_COOKIE = "hb_reel_visitor";
export const REEL_VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type VisitorIdResult = {
  visitorId: string;
  setCookie?: { name: string; value: string };
};

export async function readVisitorId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(REEL_VISITOR_COOKIE)?.value?.trim();
  return value && value.length >= 8 ? value : null;
}

export async function ensureVisitorId(): Promise<VisitorIdResult> {
  const existing = await readVisitorId();
  if (existing) return { visitorId: existing };
  const visitorId = randomUUID();
  return {
    visitorId,
    setCookie: { name: REEL_VISITOR_COOKIE, value: visitorId },
  };
}

export function appendVisitorCookie(
  response: Response,
  setCookie?: { name: string; value: string },
) {
  if (!setCookie) return response;
  response.headers.append(
    "Set-Cookie",
    `${setCookie.name}=${setCookie.value}; Path=/; Max-Age=${REEL_VISITOR_COOKIE_MAX_AGE}; SameSite=Lax${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
  return response;
}
