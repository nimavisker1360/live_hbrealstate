import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  PropertyReelUploadError,
  ensurePropertyOwnedByAgent,
  generateUniqueSlug,
  requireAgentOrAdmin,
  resolveAgentForUser,
} from "@/lib/property-reel-upload";

export const runtime = "nodejs";

const completeReelUploadSchema = z.object({
  blob: z.object({
    pathname: z.string().trim().min(1),
    url: z.string().trim().url(),
  }),
  description: z.string().trim().max(2000).optional(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().trim().min(1).optional(),
  propertyId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(160),
});

type CompleteReelUploadFields = z.infer<typeof completeReelUploadSchema>;

export async function POST(request: Request) {
  let fields: CompleteReelUploadFields | null = null;

  try {
    fields = completeReelUploadSchema.parse(await request.json());

    const sessionUser = await requireAgentOrAdmin();
    const agent = await resolveAgentForUser(sessionUser.sub);
    const property = await ensurePropertyOwnedByAgent(
      fields.propertyId,
      agent.id,
    );

    if (!fields.blob.pathname.startsWith(`property-reels/${property.id}/`)) {
      throw new PropertyReelUploadError(
        "Uploaded video does not belong to this property.",
        400,
      );
    }

    const slug = await generateUniqueSlug(fields.title || property.title);
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
        blobUrl: fields.blob.url,
        blobPathname: fields.blob.pathname,
        fileSize: fields.fileSize ? BigInt(fields.fileSize) : null,
        mimeType: fields.mimeType,
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
  } catch (error) {
    if (fields) {
      try {
        await del(fields.blob.pathname);
      } catch (cleanupError) {
        console.error("Could not delete unregistered property reel blob.", {
          pathname: fields.blob.pathname,
          cleanupError,
        });
      }
    }

    if (error instanceof PropertyReelUploadError) {
      return jsonError(error.message, error.status, error.details);
    }

    return handleApiError(error);
  }
}
