import { jsonError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  return jsonError(
    "Legacy live recording upload options are disabled. Use the property reels dashboard instead.",
    410,
  );
}
