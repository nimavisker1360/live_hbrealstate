import { jsonError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST() {
  return jsonError(
    "Legacy live recording uploads are disabled. Use property reels instead.",
    410,
  );
}
