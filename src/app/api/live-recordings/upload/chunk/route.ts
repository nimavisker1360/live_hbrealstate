import { jsonError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  return jsonError(
    "Legacy live recording chunk uploads are disabled. Use property reels instead.",
    410,
  );
}

export async function POST() {
  return jsonError(
    "Legacy live recording chunk uploads are disabled. Use property reels instead.",
    410,
  );
}
