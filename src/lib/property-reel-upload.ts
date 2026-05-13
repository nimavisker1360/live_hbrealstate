import { getCurrentSession } from "@/lib/auth";
import { getSessionBackedByDatabase } from "@/lib/auth-users";
import { canAccessAgentDashboard } from "@/lib/agent-dashboard-access";
import { prisma } from "@/lib/prisma";

export const ALLOWED_REEL_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const DEFAULT_MAX_REEL_BYTES = 1024 * 1024 * 1024;

export class PropertyReelUploadError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "PropertyReelUploadError";
    this.status = status;
    this.details = details;
  }
}

export function readMaxReelBytes() {
  const configured = process.env.PROPERTY_REEL_MAX_FILE_SIZE_BYTES?.trim();

  if (!configured || !/^\d+$/.test(configured)) {
    return DEFAULT_MAX_REEL_BYTES;
  }

  const parsed = Number(configured);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MAX_REEL_BYTES;
}

export function getReelBlobAccess(): "public" | "private" {
  return process.env.PROPERTY_REEL_BLOB_ACCESS === "private"
    ? "private"
    : "public";
}

export async function requireAgentOrAdmin() {
  const session = await getCurrentSession().catch(() => null);

  if (!session) {
    throw new PropertyReelUploadError("Authentication required.", 401);
  }

  const databaseUser = await getSessionBackedByDatabase(session);

  if (!canAccessAgentDashboard(databaseUser)) {
    throw new PropertyReelUploadError(
      "Only active admin or agent accounts can upload property reels.",
      403,
    );
  }

  return databaseUser;
}

export async function resolveAgentForUser(userId: string) {
  const agent = await prisma.agent.findUnique({
    where: { userId },
    select: { id: true, name: true, status: true },
  });

  if (agent) {
    if (agent.status !== "ACTIVE") {
      throw new PropertyReelUploadError(
        "Agent profile is not active.",
        403,
      );
    }

    return agent;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      auth0Id: true,
      email: true,
      id: true,
      name: true,
    },
  });

  if (!user) {
    throw new PropertyReelUploadError("Authenticated user not found.", 403);
  }

  if (user.auth0Id) {
    const legacyAgent = await prisma.agent.findUnique({
      where: { id: user.auth0Id },
      select: { id: true, name: true, userId: true },
    });

    if (legacyAgent && !legacyAgent.userId) {
      const linkedAgent = await prisma.agent.update({
        where: { id: legacyAgent.id },
        data: { userId: user.id },
        select: { id: true, name: true, status: true },
      });

      if (linkedAgent.status !== "ACTIVE") {
        throw new PropertyReelUploadError(
          "Agent profile is not active.",
          403,
        );
      }

      return linkedAgent;
    }

    if (legacyAgent?.userId === user.id) {
      const linkedAgent = await prisma.agent.findUnique({
        where: { id: legacyAgent.id },
        select: { id: true, name: true, status: true },
      });

      if (linkedAgent?.status !== "ACTIVE") {
        throw new PropertyReelUploadError(
          "Agent profile is not active.",
          403,
        );
      }

      return {
        id: legacyAgent.id,
        name: legacyAgent.name,
      };
    }
  }

  throw new PropertyReelUploadError(
    "No active agent profile is linked to this user.",
    403,
  );
}

export async function ensurePropertyOwnedByAgent(
  propertyId: string,
  agentId: string,
) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, agentId: true, title: true },
  });

  if (!property) {
    throw new PropertyReelUploadError("Property not found.", 404);
  }

  if (property.agentId !== agentId) {
    throw new PropertyReelUploadError(
      "You do not have permission to upload reels for this property.",
      403,
    );
  }

  return property;
}

function slugifyBase(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "property-reel"
  );
}

export async function generateUniqueSlug(seed: string) {
  const base = slugifyBase(seed);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 8);
    const candidate = `${base}-${suffix}`;
    const existing = await prisma.videoTour.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new PropertyReelUploadError(
    "Could not allocate a unique slug for the reel.",
    500,
  );
}

export function sanitizeFileName(value: string) {
  const fileName = value.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";

  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180) || "reel.mp4";
}

export function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}
