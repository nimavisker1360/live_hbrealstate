import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { z, ZodError } from "zod";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  PropertyReelUploadError,
  isFile,
  requireAgentOrAdmin,
  resolveAgentForUser,
  sanitizeFileName,
} from "@/lib/property-reel-upload";

export const runtime = "nodejs";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const propertyFieldsSchema = z.object({
  title: z.string().trim().min(2).max(160),
  location: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Price must be a positive number.")
    .optional(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code.")
    .optional(),
  bedrooms: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/)
    .optional(),
  bathrooms: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/)
    .optional(),
  areaSquareMeters: z
    .string()
    .trim()
    .regex(/^\d{1,6}$/)
    .optional(),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : undefined;
}

function emptyToUndefined(value: string | undefined) {
  return value && value.length > 0 ? value : undefined;
}

function getPublicPropertySaveErrorMessage(error: Error) {
  if (
    error.message.includes("Unknown argument") ||
    error.message.includes("does not exist in the current database")
  ) {
    return "Could not save property because the local Prisma schema is out of sync. Restart the dev server and try again.";
  }

  return "Could not save property. Check the fields and try again.";
}

export async function POST(request: Request) {
  let uploadedPathname: string | null = null;

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return jsonError("Vercel Blob storage is not configured.", 500);
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return jsonError(
        "Request must use multipart/form-data with property fields and a cover image.",
        415,
      );
    }

    const sessionUser = await requireAgentOrAdmin();
    const agent = await resolveAgentForUser(sessionUser.sub);

    const formData = await request.formData();
    const fields = propertyFieldsSchema.parse({
      title: getString(formData, "title"),
      location: getString(formData, "location"),
      description: emptyToUndefined(getString(formData, "description")),
      price: emptyToUndefined(getString(formData, "price")),
      currency: emptyToUndefined(getString(formData, "currency")),
      bedrooms: emptyToUndefined(getString(formData, "bedrooms")),
      bathrooms: emptyToUndefined(getString(formData, "bathrooms")),
      areaSquareMeters: emptyToUndefined(
        getString(formData, "areaSquareMeters"),
      ),
    });

    const cover = formData.get("coverImage");

    if (!isFile(cover)) {
      return jsonError("Choose a cover image for the property.", 400);
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(cover.type)) {
      return jsonError(
        "Unsupported image type. Use JPEG, PNG, WebP, or AVIF.",
        415,
      );
    }

    if (cover.size <= 0) {
      return jsonError("The uploaded cover image is empty.", 400);
    }

    if (cover.size > MAX_IMAGE_BYTES) {
      return jsonError(
        `The cover image exceeds the ${MAX_IMAGE_BYTES}-byte limit.`,
        413,
      );
    }

    const safeFileName = sanitizeFileName(cover.name);
    const pathname = [
      "property-covers",
      agent.id,
      `${randomUUID()}-${safeFileName}`,
    ].join("/");

    const blob = await put(pathname, cover, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: cover.type,
    });

    uploadedPathname = blob.pathname;

    try {
      const property = await prisma.property.create({
        data: {
          agentId: agent.id,
          title: fields.title,
          location: fields.location,
          description: fields.description ?? null,
          price: fields.price ?? null,
          currency: fields.currency ?? "USD",
          image: blob.url,
          imagePathname: blob.pathname,
          bedrooms: fields.bedrooms ? Number(fields.bedrooms) : null,
          bathrooms: fields.bathrooms ? Number(fields.bathrooms) : null,
          areaSquareMeters: fields.areaSquareMeters
            ? Number(fields.areaSquareMeters)
            : null,
        },
        select: {
          id: true,
          title: true,
          location: true,
          image: true,
          price: true,
          currency: true,
          bedrooms: true,
          bathrooms: true,
          areaSquareMeters: true,
          createdAt: true,
        },
      });

      return Response.json(
        {
          data: {
            id: property.id,
            title: property.title,
            location: property.location,
            image: property.image,
            price: property.price?.toString() ?? null,
            currency: property.currency,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            areaSquareMeters: property.areaSquareMeters,
            createdAt: property.createdAt.toISOString(),
          },
        },
        { status: 201 },
      );
    } catch (dbError) {
      if (uploadedPathname) {
        try {
          await del(uploadedPathname);
        } catch (cleanupError) {
          console.error(
            "Could not delete orphaned property cover blob.",
            cleanupError,
          );
        }
      }

      throw dbError;
    }
  } catch (error) {
    if (error instanceof PropertyReelUploadError) {
      return jsonError(error.message, error.status, error.details);
    }

    if (error instanceof ZodError) {
      return handleApiError(error);
    }

    console.error("[POST /api/properties] failed", error);

    if (error instanceof Error) {
      return jsonError(getPublicPropertySaveErrorMessage(error), 500);
    }

    return handleApiError(error);
  }
}
