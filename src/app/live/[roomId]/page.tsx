import { notFound } from "next/navigation";
import { LiveRoomScreen } from "@/components/live/LiveRoomScreen";
import { liveTours, properties } from "@/data/mock";

type RoomPageProps = {
  params: Promise<{
    roomId: string;
  }>;
};

export default async function LiveRoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;
  const tour = liveTours.find((item) => item.roomId === roomId);

  if (!tour) {
    notFound();
  }

  const property = properties.find((item) => item.id === tour.propertyId);
  let databaseLiveSessionId: string | undefined;

  try {
    const { ensureMockContext } = await import("@/lib/db-defaults");
    const { liveSession } = await ensureMockContext({
      agentName: tour.agent,
      propertyId: property?.id ?? tour.propertyId,
      propertyTitle: property?.title ?? tour.title,
      propertyLocation: property?.location ?? tour.location,
      roomId: tour.roomId,
      sessionTitle: tour.title,
    });

    databaseLiveSessionId = liveSession?.id;
  } catch (error) {
    console.warn("Live room is running without database context.", error);
  }

  return (
    <LiveRoomScreen
      databaseLiveSessionId={databaseLiveSessionId}
      property={property}
      tour={tour}
    />
  );
}
