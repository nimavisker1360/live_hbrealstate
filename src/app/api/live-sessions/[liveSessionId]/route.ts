import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type LiveSessionRouteContext = {
  params: Promise<{
    liveSessionId: string;
  }>;
};

async function getWritableSession() {
  const session = await getCurrentSession().catch(() => null);

  if (session?.role === "BUYER") {
    return { response: jsonError("Unauthorized.", 403) };
  }

  return { session };
}

export async function DELETE(
  _request: Request,
  { params }: LiveSessionRouteContext,
) {
  try {
    const writable = await getWritableSession();

    if (writable.response) {
      return writable.response;
    }

    const { liveSessionId } = await params;

    const deleted = await prisma.$transaction(async (tx) => {
      const liveSession = await tx.liveSession.findUnique({
        where: { id: liveSessionId },
        select: {
          propertyId: true,
        },
      });

      if (!liveSession) {
        return { deletedProperty: false };
      }

      await tx.liveSession.delete({
        where: { id: liveSessionId },
      });

      const remainingLiveSessionCount = await tx.liveSession.count({
        where: { propertyId: liveSession.propertyId },
      });

      if (remainingLiveSessionCount > 0) {
        return { deletedProperty: false };
      }

      await tx.property.delete({
        where: { id: liveSession.propertyId },
      });

      return { deletedProperty: true };
    });

    revalidatePath("/");
    revalidatePath("/live");
    revalidatePath("/agent/dashboard");
    return Response.json({ success: true, ...deleted });
  } catch (error) {
    return handleApiError(error);
  }
}
