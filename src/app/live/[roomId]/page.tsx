import { redirect } from "next/navigation";

type RoomPageProps = {
  params: Promise<{
    roomId: string;
  }>;
};

export default async function LegacyLiveRoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;

  redirect(`/reels/${roomId}`);
}
