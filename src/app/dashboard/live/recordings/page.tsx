import { redirect } from "next/navigation";

export default function LegacyRecordingsPage() {
  redirect("/agent/dashboard");
}
