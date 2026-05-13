import type {
  AuthRole,
  AuthSession,
  AuthUserStatus,
  LiveAuthUser,
} from "@/lib/auth";

type AuthUserInput = {
  sub: string;
  name?: string;
  email?: string;
  phone?: string;
  role: AuthRole;
  status?: AuthUserStatus;
};

type PersistedAuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AuthRole;
  status: AuthUserStatus;
};

const userSelect = {
  agencyName: true,
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
} as const;

const externalUserSelect = {
  agencyName: true,
  id: true,
  auth0Id: true,
  email: true,
  name: true,
  picture: true,
  role: true,
  status: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function sessionDisplayName(user: AuthUserInput) {
  return user.name ?? user.email ?? "HB agent";
}

function externalDisplayName(user: LiveAuthUser) {
  return user.name ?? user.email ?? "HB agent";
}

function normalizeEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();

  return normalized || undefined;
}

function requireEmail(email?: string | null) {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    throw new Error("An email address is required for shared user access.");
  }

  return normalized;
}

export function isActivePrivilegedUser(
  user: Pick<PersistedAuthUser, "role" | "status"> | null | undefined,
) {
  return (
    Boolean(user) &&
    user?.status === "ACTIVE" &&
    (user.role === "ADMIN" || user.role === "AGENT")
  );
}

export async function syncAuthUser(user: AuthUserInput) {
  const { prisma } = await import("@/lib/prisma");
  const email = normalizeEmail(user.email);
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ id: user.sub }, ...(email ? [{ email }] : [])],
    },
    select: userSelect,
  });

  if (existingUser) {
    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        email: email ?? existingUser.email,
        name: sessionDisplayName(user),
        phone: user.phone,
        lastSeenAt: new Date(),
      },
      select: userSelect,
    });
  }

  return prisma.user.create({
    data: {
      id: user.sub,
      email: requireEmail(email),
      name: sessionDisplayName(user),
      phone: user.phone,
      role: "AGENT",
      status: "PENDING",
    },
    select: userSelect,
  });
}

export async function syncExternalAuthUser(user: LiveAuthUser) {
  const { prisma } = await import("@/lib/prisma");
  const lastSeenAt = new Date();
  const email = normalizeEmail(user.email);
  const picture = user.picture ?? null;
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ auth0Id: user.auth0Id }, ...(email ? [{ email }] : [])],
    },
    select: externalUserSelect,
  });

  if (existingUser) {
    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        auth0Id: existingUser.auth0Id ?? user.auth0Id,
        email: email ?? existingUser.email,
        name: externalDisplayName(user),
        picture,
        lastSeenAt,
      },
      select: externalUserSelect,
    });
  }

  return prisma.user.create({
    data: {
      auth0Id: user.auth0Id,
      email: requireEmail(email),
      name: externalDisplayName(user),
      picture,
      lastSeenAt,
      role: "AGENT",
      status: "PENDING",
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
        ...(session.email ? [{ email: normalizeEmail(session.email) }] : []),
      ],
    },
    select: userSelect,
  });
  const user = existingUser ?? (await syncAuthUser(session));

  return {
    sub: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    role: user.role,
    status: user.status,
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
    email: user.email,
    phone: user.phone ?? undefined,
    role: user.role,
    status: user.status,
  };
}
