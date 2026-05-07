import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  PropertyReelUploadError,
  requireAgentOrAdmin,
  resolveAgentForUser,
} from "@/lib/property-reel-upload";

export const runtime = "nodejs";

const publishSchema = z.object({
  publish: z.boolean(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reelId: string }> },
) {
  try {
    const { reelId } = await params;
    const sessionUser = await requireAgentOrAdmin();
    const agent = await resolveAgentForUser(sessionUser.sub);

    const body = await request.json();
    const { publish } = publishSchema.parse(body);

    const reel = await prisma.videoTour.findUnique({
      where: { id: reelId },
      select: { id: true, agentId: true, publishedAt: true },
    });

    if (!reel) {
      throw new PropertyReelUploadError("Property reel not found.", 404);
    }

    if (reel.agentId !== agent.id) {
      throw new PropertyReelUploadError(
        "You do not have permission to modify this property reel.",
        403,
      );
    }

    const updated = await prisma.videoTour.update({
      where: { id: reel.id },
      data: publish
        ? {
            status: "PUBLISHED",
            publishedAt: reel.publishedAt ?? new Date(),
          }
        : {
            status: "DRAFT",
          },
      select: {
        id: true,
        status: true,
        publishedAt: true,
      },
    });

    return Response.json({ data: updated });
  } catch (error) {
    if (error instanceof PropertyReelUploadError) {
      return jsonError(error.message, error.status, error.details);
    }

    return handleApiError(error);
  }
}
