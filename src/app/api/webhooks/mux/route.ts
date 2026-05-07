import { jsonError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST() {
  return jsonError("This webhook is disabled for the property reels platform.", 410);
}
