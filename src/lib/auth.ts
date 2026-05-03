import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "hb_live_session";

export type AuthRole = "OWNER" | "AGENT" | "BUYER";

export type AuthSession = {
  sub: string;
  name?: string;
  email?: string;
  phone?: string;
  role: AuthRole;
  iat: number;
  exp: number;
};

type MainSiteTokenPayload = {
  sub?: string;
  userId?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  exp?: number;
};

type LiveAuthTokenPayload = {
  auth0Id?: unknown;
  sub?: unknown;
  email?: unknown;
  name?: unknown;
  picture?: unknown;
  exp?: number;
};

export type LiveAuthUser = {
  auth0Id: string;
  email?: string;
  name?: string;
  picture?: string;
};

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64");
}

function getRequiredSecret(
  name: "HB_LIVE_SESSION_SECRET" | "HB_SSO_SECRET" | "LIVE_AUTH_SECRET",
) {
  const secret = process.env[name]?.trim();

  if (!secret) {
    throw new Error(`${name} is not configured.`);
  }

  return secret;
}

function signInput(input: string, secret: string) {
  return base64UrlEncode(createHmac("sha256", secret).update(input).digest());
}

export async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const input = `${header}.${body}`;

  return `${input}.${signInput(input, secret)}`;
}

export async function verifyJwt<T extends object>(
  token: string,
  secret: string,
) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [header, body, signature] = parts;
  const input = `${header}.${body}`;
  const expected = signInput(input, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(body).toString("utf8")) as T & {
    exp?: number;
  };
  const now = Math.floor(Date.now() / 1000);

  if (typeof payload.exp === "number" && payload.exp <= now) {
    return null;
  }

  return payload;
}

function getStringClaim(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readEmailList(value?: string) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeRole(role?: string): AuthRole {
  if (role === "OWNER" || role === "ADMIN") {
    return "OWNER";
  }

  if (role === "AGENT") {
    return "AGENT";
  }

  return "BUYER";
}

function resolveMainSiteRole(role?: string, email?: string): AuthRole {
  const normalizedEmail = email?.trim().toLowerCase();

  if (
    normalizedEmail &&
    readEmailList(process.env.HB_LIVE_OWNER_EMAILS).includes(normalizedEmail)
  ) {
    return "OWNER";
  }

  if (
    normalizedEmail &&
    readEmailList(process.env.HB_LIVE_AGENT_EMAILS).includes(normalizedEmail)
  ) {
    return "AGENT";
  }

  return normalizeRole(role);
}

export async function createSessionToken(
  payload: Omit<AuthSession, "iat" | "exp">,
) {
  const now = Math.floor(Date.now() / 1000);

  return signJwt(
    {
      ...payload,
      iat: now,
      exp: now + SESSION_MAX_AGE_SECONDS,
    },
    getRequiredSecret("HB_LIVE_SESSION_SECRET"),
  );
}

export async function verifySessionToken(token?: string) {
  if (!token) {
    return null;
  }

  return verifyJwt<AuthSession>(token, getRequiredSecret("HB_LIVE_SESSION_SECRET"));
}

export async function getCurrentSession() {
  const cookieStore = await cookies();

  return verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export async function verifyMainSiteToken(token: string) {
  const payload = await verifyJwt<MainSiteTokenPayload>(
    token,
    getRequiredSecret("HB_SSO_SECRET"),
  );

  if (!payload) {
    return null;
  }

  const sub = payload.sub ?? payload.userId ?? payload.id ?? payload.email;

  if (!sub) {
    return null;
  }

  return {
    sub,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    role: resolveMainSiteRole(payload.role, payload.email),
  };
}

export async function verifyLiveAuthToken(token: string) {
  let payload: LiveAuthTokenPayload | null = null;

  try {
    payload = await verifyJwt<LiveAuthTokenPayload>(
      token,
      getRequiredSecret("LIVE_AUTH_SECRET"),
    );
  } catch {
    return null;
  }

  if (!payload) {
    return null;
  }

  const auth0Id = getStringClaim(payload.auth0Id) ?? getStringClaim(payload.sub);

  if (!auth0Id) {
    return null;
  }

  return {
    auth0Id,
    email: getStringClaim(payload.email),
    name: getStringClaim(payload.name),
    picture: getStringClaim(payload.picture),
  } satisfies LiveAuthUser;
}

export const sessionCookieOptions = {
  httpOnly: true,
  maxAge: SESSION_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
