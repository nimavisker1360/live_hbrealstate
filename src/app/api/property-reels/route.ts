import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { handleApiError, jsonError } from "@/lib/api";
import { getCurrentSession } from "@/lib/auth";
import { getSessionBackedByDatabase } from "@/lib/auth-users";
import { ensureMockContext } from "@/lib/db-defaults";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);
const DEFAULT_MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024;

const reelFieldsSchema = z.object({
  agentId: z.string().trim().min(1).optional(),
  agentName: z.string().trim().min(1).optional(),
  propertyId: z.string().trim().optional(),
  propertyTitle: z.string().trim().min(2).max(160),
  propertyLocation: z.string().trim().min(2).max(160),
  propertyDescription: z.string().trim().max(2000).optional(),
  propertyImage: z.string().trim().optional(),
  title: z.string().trim().min(2).max(160),
});

function readMaxFileSize() {
  const configured = process.env.PROPERTY_REEL_MAX_FILE_SIZE_BYTES?.trim();

  if (!configured || !/^\d+$/.test(configured)) {
    return DEFAULT_MAX_FILE_SIZE_BYTES;
  }

  const parsed = Number(configured);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MAX_FILE_SIZE_BYTES;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "property-reel"
  );
}

function sanitizeFileName(value: string) {
  const fileName = value.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";

  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180) || "reel.mp4";
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

async function getWritableUser(agentId?: string, agentName?: string) {
  const session = await getCurrentSession().catch(() => null);

  if (session?.role === "BUYER") {
    return { response: jsonError("Unauthorized.", 403) };
  }

  if (session) {
    return { user: await getSessionBackedByDatabase(session) };
  }

  if (process.env.NODE_ENV === "production") {
    return { response: jsonError("Authentication required.", 401) };
  }

  const fallbackUser = await prisma.user.upsert({
    where: { id: agentId ?? "hb-property-reels-agent" },
    update: {
      name: agentName ?? "HB Real Estate Agent",
      role: "AGENT",
    },
    create: {
      id: agentId ?? "hb-property-reels-agent",
      name: agentName ?? "HB Real Estate Agent",
      role: "AGENT",
    },
    select: {
      email: true,
      id: true,
      name: true,
      phone: true,
      role: true,
    },
  });

  return {
    user: {
      sub: fallbackUser.id,
      name: fallbackUser.name,
      email: fallbackUser.email ?? undefined,
      phone: fallbackUser.phone ?? undefined,
      role: fallbackUser.role,
    },
  };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

export async function POST(request: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return jsonError("Vercel Blob storage is not configured.", 500);
    }

    const formData = await request.formData();
    const fields = reelFieldsSchema.parse({
      agentId: getString(formData, "agentId") || undefined,
      agentName: getString(formData, "agentName") || undefined,
      propertyId: getString(formData, "propertyId") || undefined,
      propertyTitle: getString(formData, "propertyTitle"),
      propertyLocation: getString(formData, "propertyLocation"),
      propertyDescription: getString(formData, "propertyDescription") || undefined,
      propertyImage: getString(formData, "propertyImage") || undefined,
      title: getString(formData, "title"),
    });
    const writable = await getWritableUser(fields.agentId, fields.agentName);

    if (writable.response) {
      return writable.response;
    }

    const video = formData.get("video");

    if (!isFile(video)) {
      return jsonError("Choose a property video to upload.", 400);
    }

    if (!ALLOWED_VIDEO_MIME_TYPES.has(video.type)) {
      return jsonError("Unsupported video type. Use MP4, QuickTime, or WebM.", 415);
    }

    if (video.size <= 0) {
      return jsonError("The uploaded video is empty.", 400);
    }

    if (video.size > readMaxFileSize()) {
      return jsonError("The uploaded video exceeds the file size limit.", 413);
    }

    const propertyId =
      fields.propertyId ||
      `property-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const roomId = `${slugify(fields.title)}-${randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)}`;
    const { liveSession } = await ensureMockContext({
      agentId: fields.agentId ?? writable.user?.sub,
      agentName: fields.agentName ?? writable.user?.name ?? "HB Real Estate Agent",
      propertyId,
      propertyTitle: fields.propertyTitle,
      propertyLocation: fields.propertyLocation,
      propertyDescription: fields.propertyDescription,
      propertyImage: fields.propertyImage,
      roomId,
      sessionTitle: fields.title,
      status: "ENDED",
    });

    if (!liveSession) {
      return jsonError("Could not create property reel.", 500);
    }

    const safeFileName = sanitizeFileName(video.name);
    const blob = await put(
      ["property-reels", liveSession.roomId, `${randomUUID()}-${safeFileName}`].join(
        "/",
      ),
      video,
      {
        access: "public",
        contentType: video.type,
      },
    );

    const updatedReel = await prisma.liveSession.update({
      where: { id: liveSession.id },
      data: {
        endedAt: new Date(),
        recordingPlaybackId: blob.url,
        recordingReadyAt: new Date(),
        recordingStatus: "ready",
        streamProvider: "vercel_blob",
      },
      select: {
        id: true,
        recordingPlaybackId: true,
        roomId: true,
        title: true,
        property: { select: { id: true, location: true, title: true } },
      },
    });
    const reelPagePath = `/reels/${updatedReel.roomId}`;
    const origin = new URL(request.url).origin;

    return Response.json(
      {
        data: {
          id: updatedReel.id,
          property: updatedReel.property,
          reelPageUrl: `${origin}${reelPagePath}`,
          roomId: updatedReel.roomId,
          title: updatedReel.title,
          videoUrl: updatedReel.recordingPlaybackId,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
