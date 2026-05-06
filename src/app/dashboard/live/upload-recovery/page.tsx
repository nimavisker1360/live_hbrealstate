import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UploadRecoveryClient } from "@/components/live/upload/UploadRecoveryClient";

export const metadata = {
  title: "Upload Recovery | HB Live",
  description: "Upload video files saved locally when your connection was lost.",
};

export default async function UploadRecoveryPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/api/auth/start?return_to=/dashboard/live/upload-recovery");
  }

  if (session.role === "BUYER") {
    redirect("/");
  }

  // Fetch live sessions for this agent
  const liveSessions = await prisma.liveSession.findMany({
    where: {
      agentId: session.sub,
    },
    select: {
      id: true,
      title: true,
      status: true,
      property: {
        select: {
          title: true,
          location: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return <UploadRecoveryClient initialSessions={liveSessions} />;
}
