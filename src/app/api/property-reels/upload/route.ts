import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  ALLOWED_REEL_MIME_TYPES,
  PropertyReelUploadError,
  ensurePropertyOwnedByAgent,
  generateUniqueSlug,
  getReelBlobAccess,
  isFile,
  readMaxReelBytes,
  requireAgentOrAdmin,
  resolveAgentForUser,
  sanitizeFileName,
} from "@/lib/property-reel-upload";

export const runtime = "nodejs";

const reelMetadataSchema = z.object({
  propertyId: z.string().trim().min(1, "propertyId is required."),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

export async function POST(request: Request) {
  let uploadedPathname: string | null = null;

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return jsonError("Vercel Blob storage is not configured.", 500);
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return jsonError(
        "Request must use multipart/form-data with fields propertyId, title, and video.",
        415,
      );
    }

    const sessionUser = await requireAgentOrAdmin();
    const agent = await resolveAgentForUser(sessionUser.sub);

    const formData = await request.formData();
    const fields = reelMetadataSchema.parse({
      propertyId: getString(formData, "propertyId"),
      title: getString(formData, "title"),
      description: getString(formData, "description") || undefined,
    });

    const property = await ensurePropertyOwnedByAgent(
      fields.propertyId,
      agent.id,
    );

    const video = formData.get("video");

    if (!isFile(video)) {
      return jsonError("Choose a property video to upload.", 400);
    }

    if (!ALLOWED_REEL_MIME_TYPES.has(video.type)) {
      return jsonError(
        "Unsupported video type. Use MP4, QuickTime, or WebM.",
        415,
      );
    }

    if (video.size <= 0) {
      return jsonError("The uploaded video is empty.", 400);
    }

    const maxBytes = readMaxReelBytes();

    if (video.size > maxBytes) {
      return jsonError(
        `The uploaded video exceeds the ${maxBytes}-byte limit.`,
        413,
      );
    }

    const slug = await generateUniqueSlug(fields.title || property.title);
    const safeFileName = sanitizeFileName(video.name);
    const pathname = [
      "property-reels",
      property.id,
      `${slug}-${randomUUID()}-${safeFileName}`,
    ].join("/");

    const blob = await put(pathname, video, {
      access: getReelBlobAccess(),
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: video.type,
    });

    uploadedPathname = blob.pathname;

    try {
      const publishedAt = new Date();
      const videoTour = await prisma.videoTour.create({
        data: {
          slug,
          propertyId: property.id,
          agentId: agent.id,
          title: fields.title,
          description: fields.description,
          status: "PUBLISHED",
          publishedAt,
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          fileSize: BigInt(video.size),
          mimeType: video.type,
        },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          status: true,
          blobUrl: true,
          blobPathname: true,
          mimeType: true,
          fileSize: true,
          propertyId: true,
          agentId: true,
          createdAt: true,
        },
      });

      revalidatePath("/reels");
      revalidatePath(`/reels/${videoTour.slug}`);
      revalidatePath("/agent/dashboard");

      return Response.json(
        {
          data: {
            id: videoTour.id,
            slug: videoTour.slug,
            title: videoTour.title,
            description: videoTour.description,
            status: videoTour.status,
            videoUrl: videoTour.blobUrl,
            blobPath: videoTour.blobPathname,
            mimeType: videoTour.mimeType,
            fileSize: videoTour.fileSize?.toString() ?? null,
            propertyId: videoTour.propertyId,
            agentId: videoTour.agentId,
            createdAt: videoTour.createdAt.toISOString(),
          },
        },
        { status: 201 },
      );
    } catch (dbError) {
      if (uploadedPathname) {
        try {
          await del(uploadedPathname);
        } catch (cleanupError) {
          console.error(
            "Could not delete orphaned property reel blob.",
            cleanupError,
          );
        }
      }

      throw dbError;
    }
  } catch (error) {
    if (error instanceof PropertyReelUploadError) {
      return jsonError(error.message, error.status, error.details);
    }

    return handleApiError(error);
  }
}
