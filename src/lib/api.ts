import { Prisma } from "@/generated/prisma/client";
import { ZodError } from "zod";

export function jsonError(
  message: string,
  status = 500,
  details?: unknown,
): Response {
  return Response.json(
    {
      error: {
        message,
        details,
      },
    },
    { status },
  );
}

export function handleApiError(error: unknown): Response {
  if (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return jsonError(error.message, error.status);
  }

  if (error instanceof ZodError) {
    return jsonError("Invalid request payload.", 400, error.flatten());
  }

  if (error instanceof SyntaxError) {
    return jsonError("Request body must be valid JSON.", 400);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return jsonError("Database request failed.", 400, {
      code: error.code,
      meta: error.meta,
    });
  }

  console.error(error);
  return jsonError("Unexpected server error.", 500);
}

export function getStringParam(request: Request, key: string) {
  const value = new URL(request.url).searchParams.get(key);
  return value?.trim() || undefined;
}
