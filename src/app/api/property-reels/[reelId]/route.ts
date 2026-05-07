import { del } from "@vercel/blob";
import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  PropertyReelUploadError,
  requireAgentOrAdmin,
  resolveAgentForUser,
} from "@/lib/property-reel-upload";

export const runtime = "nodejs";

const editSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

async function loadReelOwnedByAgent(reelId: string, agentId: string) {
  const reel = await prisma.videoTour.findUnique({
    where: { id: reelId },
    select: {
      id: true,
      agentId: true,
      blobPathname: true,
    },
  });

  if (!reel) {
    throw new PropertyReelUploadError("Property reel not found.", 404);
  }

  if (reel.agentId !== agentId) {
    throw new PropertyReelUploadError(
      "You do not have permission to modify this property reel.",
      403,
    );
  }

  return reel;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reelId: string }> },
) {
  try {
    const { reelId } = await params;
    const sessionUser = await requireAgentOrAdmin();
    const agent = await resolveAgentForUser(sessionUser.sub);
    await loadReelOwnedByAgent(reelId, agent.id);

    const body = await request.json();
    const fields = editSchema.parse(body);

    if (
      fields.title === undefined &&
      fields.description === undefined
    ) {
      return jsonError("Provide title or description to update.", 400);
    }

    const updated = await prisma.videoTour.update({
      where: { id: reelId },
      data: {
        ...(fields.title !== undefined ? { title: fields.title } : {}),
        ...(fields.description !== undefined
          ? { description: fields.description ?? null }
          : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        slug: true,
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ reelId: string }> },
) {
  try {
    const { reelId } = await params;
    const sessionUser = await requireAgentOrAdmin();
    const agent = await resolveAgentForUser(sessionUser.sub);
    const reel = await loadReelOwnedByAgent(reelId, agent.id);

    await prisma.videoTour.delete({ where: { id: reel.id } });

    if (reel.blobPathname) {
      try {
        await del(reel.blobPathname);
      } catch (cleanupError) {
        console.error(
          "Could not delete property reel blob after row deletion.",
          cleanupError,
        );
      }
    }

    return Response.json({ data: { id: reel.id, deleted: true } });
  } catch (error) {
    if (error instanceof PropertyReelUploadError) {
      return jsonError(error.message, error.status, error.details);
    }

    return handleApiError(error);
  }
}
