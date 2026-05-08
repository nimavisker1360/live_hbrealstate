import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  PropertyReelUploadError,
  requireAgentOrAdmin,
  resolveAgentForUser,
} from "@/lib/property-reel-upload";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ propertyId: string }> },
) {
  try {
    const { propertyId } = await params;
    const sessionUser = await requireAgentOrAdmin();
    const agent = await resolveAgentForUser(sessionUser.sub);

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        agentId: true,
        imagePathname: true,
        title: true,
        videoTours: {
          select: { blobPathname: true },
        },
      },
    });

    if (!property) {
      throw new PropertyReelUploadError("Property not found.", 404);
    }

    if (property.agentId !== agent.id) {
      throw new PropertyReelUploadError(
        "You do not have permission to delete this property.",
        403,
      );
    }

    const blobPathnames = [
      property.imagePathname,
      ...property.videoTours.map((tour) => tour.blobPathname),
    ].filter((pathname): pathname is string => Boolean(pathname));

    await prisma.property.delete({ where: { id: property.id } });

    await Promise.all(
      blobPathnames.map(async (pathname) => {
        try {
          await del(pathname);
        } catch (cleanupError) {
          console.error("Could not delete property blob.", {
            pathname,
            cleanupError,
          });
        }
      }),
    );

    revalidatePath("/");
    revalidatePath("/reels");
    revalidatePath("/agent/dashboard");

    return Response.json({
      data: { id: property.id, title: property.title, deleted: true },
    });
  } catch (error) {
    if (error instanceof PropertyReelUploadError) {
      return jsonError(error.message, error.status, error.details);
    }

    return handleApiError(error);
  }
}
