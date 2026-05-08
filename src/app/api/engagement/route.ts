import { revalidatePath } from "next/cache";
import { handleApiError, jsonError } from "@/lib/api";
import {
  PropertyReelUploadError,
  requireAgentOrAdmin,
} from "@/lib/property-reel-upload";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE() {
  try {
    await requireAgentOrAdmin();

    const result = await prisma.$transaction(async (tx) => {
      const [
        videoTourComments,
        videoTourLikes,
        liveComments,
        liveLikes,
      ] = await Promise.all([
        tx.videoTourComment.deleteMany(),
        tx.videoTourLike.deleteMany(),
        tx.comment.deleteMany(),
        tx.likeEvent.deleteMany(),
      ]);

      await tx.videoTour.updateMany({
        data: {
          commentCount: 0,
          likeCount: 0,
        },
      });

      return {
        commentsDeleted: videoTourComments.count + liveComments.count,
        likesDeleted: videoTourLikes.count + liveLikes.count,
      };
    });

    revalidatePath("/agent/dashboard");
    revalidatePath("/reels");

    return Response.json({
      data: {
        ...result,
        deleted: true,
      },
    });
  } catch (error) {
    if (error instanceof PropertyReelUploadError) {
      return jsonError(error.message, error.status, error.details);
    }

    return handleApiError(error);
  }
}
