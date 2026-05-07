import { jsonError } from "@/lib/api";

export const runtime = "nodejs";

function disabled() {
  return jsonError(
    "Legacy live recording replay processing is disabled. Use property reels instead.",
    410,
  );
}

export async function PATCH() {
  return disabled();
}

export async function DELETE() {
  return disabled();
}
