import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api";
import {
  ALLOWED_REEL_MIME_TYPES,
  PropertyReelUploadError,
  ensurePropertyOwnedByAgent,
  readMaxReelBytes,
  requireAgentOrAdmin,
  resolveAgentForUser,
} from "@/lib/property-reel-upload";

export const runtime = "nodejs";

const clientPayloadSchema = z.object({
  propertyId: z.string().trim().min(1),
});

function parseClientPayload(value: string | null) {
  return clientPayloadSchema.parse(JSON.parse(value || "{}"));
}

export async function POST(request: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return jsonError("Vercel Blob storage is not configured.", 500);
    }

    const body = (await request.json()) as HandleUploadBody;

    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parseClientPayload(clientPayload);
        const sessionUser = await requireAgentOrAdmin();
        const agent = await resolveAgentForUser(sessionUser.sub);

        await ensurePropertyOwnedByAgent(payload.propertyId, agent.id);

        if (!pathname.startsWith(`property-reels/${payload.propertyId}/`)) {
          throw new PropertyReelUploadError(
            "Invalid upload destination for this property.",
            400,
          );
        }

        return {
          addRandomSuffix: false,
          allowOverwrite: false,
          allowedContentTypes: Array.from(ALLOWED_REEL_MIME_TYPES),
          maximumSizeInBytes: readMaxReelBytes(),
          tokenPayload: clientPayload,
        };
      },
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof PropertyReelUploadError) {
      return jsonError(error.message, error.status, error.details);
    }

    return handleApiError(error);
  }
}
