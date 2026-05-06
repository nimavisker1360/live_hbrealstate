import type { AuthRole, AuthSession, LiveAuthUser } from "@/lib/auth";

type AuthUserInput = {
  sub: string;
  name?: string;
  email?: string;
  phone?: string;
  role: AuthRole;
};

type PersistedAuthUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: AuthRole;
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
} as const;

const externalUserSelect = {
  id: true,
  auth0Id: true,
  email: true,
  name: true,
  picture: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function sessionDisplayName(user: AuthUserInput) {
  return user.name ?? user.email ?? "HB buyer";
}

function externalDisplayName(user: LiveAuthUser) {
  return user.name ?? user.email ?? "HB viewer";
}

export async function syncAuthUser(user: AuthUserInput) {
  const { prisma } = await import("@/lib/prisma");

  return prisma.user.upsert({
    where: { id: user.sub },
    update: {
      email: user.email,
      name: sessionDisplayName(user),
      phone: user.phone,
      role: user.role,
    },
    create: {
      id: user.sub,
      email: user.email,
      name: sessionDisplayName(user),
      phone: user.phone,
      role: user.role,
    },
    select: userSelect,
  });
}

export async function syncExternalAuthUser(user: LiveAuthUser) {
  const { prisma } = await import("@/lib/prisma");
  const lastSeenAt = new Date();
  const email = user.email ?? null;
  const picture = user.picture ?? null;

  return prisma.user.upsert({
    where: { auth0Id: user.auth0Id },
    update: {
      email,
      name: externalDisplayName(user),
      picture,
      lastSeenAt,
    },
    create: {
      auth0Id: user.auth0Id,
      email,
      name: externalDisplayName(user),
      picture,
      lastSeenAt,
    },
    select: externalUserSelect,
  });
}

export async function getSessionBackedByDatabase(session: AuthSession) {
  const { prisma } = await import("@/lib/prisma");
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: session.sub },
        { auth0Id: session.sub },
        ...(session.email ? [{ email: session.email }] : []),
      ],
    },
    select: userSelect,
  });
  const user = existingUser ?? (await syncAuthUser(session));

  return {
    sub: user.id,
    name: user.name,
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    role: user.role,
  } satisfies Omit<AuthSession, "iat" | "exp">;
}

export function mergeSessionWithPersistedUser(
  session: AuthSession,
  user: PersistedAuthUser,
) {
  return {
    ...session,
    sub: user.id,
    name: user.name,
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    role: user.role,
  };
}
