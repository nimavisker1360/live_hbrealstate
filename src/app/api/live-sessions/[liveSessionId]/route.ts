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

    await prisma.liveSession.delete({
      where: { id: liveSessionId },
    });

    revalidatePath("/agent/dashboard");
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
