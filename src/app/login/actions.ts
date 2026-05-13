"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export type LoginActionState = {
  message: string;
  tone: "error" | "info";
};

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const statusMessages = {
  PENDING: "Your account is waiting for admin approval.",
  REJECTED: "Your account was rejected.",
  SUSPENDED: "Your account has been suspended.",
} as const;

const invalidLoginState = {
  message: "Invalid email or password.",
  tone: "error",
} satisfies LoginActionState;

type MainApiAgent = {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  agencyName?: string;
  role?: string;
  status?: string;
};

type MainApiLoginResponse = {
  agent?: MainApiAgent;
  token?: string;
  message?: string;
};

function activeRedirectForRole(role: "ADMIN" | "AGENT") {
  return role === "ADMIN" ? "/admin" : "/agent/dashboard";
}

function getMainApiBaseUrl() {
  const configured =
    process.env.HB_MAIN_API_URL ||
    process.env.NEXT_PUBLIC_HB_MAIN_API_URL ||
    "http://localhost:8000/api";

  return configured.replace(/\/+$/, "");
}

async function loginViaMainProject(email: string, password: string) {
  const response = await fetch(`${getMainApiBaseUrl()}/property-reels-agents/login`, {
    body: JSON.stringify({ email, password }),
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const payload = (await response.json().catch(() => ({}))) as MainApiLoginResponse;

  if (!response.ok || !payload.agent || payload.agent.status !== "ACTIVE") {
    return null;
  }

  const agent = payload.agent;
  const user = await prisma.user.upsert({
    where: { email: agent.email.toLowerCase() },
    create: {
      id: agent.id,
      email: agent.email.toLowerCase(),
      name: agent.name || agent.email,
      phone: agent.phone || null,
      agencyName: agent.agencyName || null,
      role: "AGENT",
      status: "ACTIVE",
      lastSeenAt: new Date(),
    },
    update: {
      name: agent.name || agent.email,
      phone: agent.phone || null,
      agencyName: agent.agencyName || null,
      role: "AGENT",
      status: "ACTIVE",
      lastSeenAt: new Date(),
    },
    select: {
      agencyName: true,
      email: true,
      id: true,
      name: true,
      phone: true,
      role: true,
      status: true,
    },
  });

  await prisma.agent.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      name: user.name,
      company: user.agencyName || "HB Real Estate",
      status: "ACTIVE",
    },
    update: {
      name: user.name,
      company: user.agencyName || "HB Real Estate",
      status: "ACTIVE",
    },
    select: { id: true },
  });

  return user;
}

export async function loginAction(
  _prevState: LoginActionState | null,
  formData: FormData,
) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return invalidLoginState;
  }

  const email = parsed.data.email.toLowerCase();
  const mainProjectUser = await loginViaMainProject(email, parsed.data.password).catch(
    (error) => {
      console.error("Main project agent login failed:", error?.message || error);
      return null;
    },
  );

  if (mainProjectUser) {
    const token = await createSessionToken({
      sub: mainProjectUser.id,
      name: mainProjectUser.name,
      email: mainProjectUser.email,
      phone: mainProjectUser.phone ?? undefined,
      role: mainProjectUser.role,
      status: mainProjectUser.status,
    });

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, sessionCookieOptions);

    redirect(activeRedirectForRole(mainProjectUser.role));
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      email: true,
      id: true,
      name: true,
      passwordHash: true,
      phone: true,
      role: true,
      status: true,
    },
  });

  if (
    !user ||
    (user.role !== "ADMIN" && user.role !== "AGENT") ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  ) {
    return invalidLoginState;
  }

  if (user.status !== "ACTIVE") {
    return {
      message: statusMessages[user.status],
      tone: "info",
    } satisfies LoginActionState;
  }

  const token = await createSessionToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    role: user.role,
    status: user.status,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
    select: { id: true },
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, sessionCookieOptions);

  redirect(activeRedirectForRole(user.role));
}
