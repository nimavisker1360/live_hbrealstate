import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const leadPayloadSchema = z
  .object({
    agentId: nonEmptyString.optional(),
    agentName: nonEmptyString.optional(),
    propertyId: nonEmptyString.optional(),
    propertyTitle: nonEmptyString.optional(),
    propertyLocation: nonEmptyString.optional(),
    roomId: nonEmptyString.optional(),
    source: nonEmptyString.default("Get Details"),
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(6).max(32),
    budget: z.string().trim().min(2).max(120),
    viewingAt: z.string().datetime().optional(),
    interest: z.string().trim().max(240).optional(),
    interestedIn: z.array(z.string().trim().min(1)).max(8).optional(),
    message: z.string().trim().max(1000).optional(),
  })
  .superRefine((payload, context) => {
    if (payload.source === "Book Viewing" && !payload.viewingAt) {
      context.addIssue({
        code: "custom",
        message: "Viewing date and time is required for booking requests.",
        path: ["viewingAt"],
      });
    }
  })
  .transform((payload) => ({
    ...payload,
    viewingAt: payload.viewingAt ? new Date(payload.viewingAt) : undefined,
    interest:
      payload.interest ??
      payload.interestedIn?.join(", ") ??
      "General property inquiry",
  }));

export const offerPayloadSchema = z
  .object({
    agentId: nonEmptyString.optional(),
    agentName: nonEmptyString.optional(),
    propertyId: nonEmptyString.optional(),
    propertyTitle: nonEmptyString.optional(),
    propertyLocation: nonEmptyString.optional(),
    roomId: nonEmptyString.optional(),
    buyerName: z.string().trim().min(2).max(120).optional(),
    fullName: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().min(6).max(32),
    amount: z.union([z.string(), z.number()]).optional(),
    offerAmount: z.union([z.string(), z.number()]).optional(),
    currency: z.enum(["USD", "EUR", "TRY"]).default("USD"),
    message: z.string().trim().max(1000).optional(),
  })
  .transform((payload, context) => {
    const buyerName = payload.buyerName ?? payload.fullName;
    const rawAmount = payload.amount ?? payload.offerAmount;
    const amount = String(rawAmount ?? "").replace(/,/g, "").trim();

    if (!buyerName) {
      context.addIssue({
        code: "custom",
        message: "buyerName or fullName is required.",
        path: ["buyerName"],
      });
    }

    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      context.addIssue({
        code: "custom",
        message: "Offer amount must be a positive number.",
        path: ["amount"],
      });
    }

    return {
      ...payload,
      buyerName: buyerName ?? "",
      amount,
    };
  });

export const commentPayloadSchema = z.object({
  agentId: nonEmptyString.optional(),
  clientEventId: z.string().trim().max(120).optional(),
  liveSessionId: nonEmptyString.optional(),
  propertyId: nonEmptyString.optional(),
  propertyTitle: nonEmptyString.optional(),
  propertyLocation: nonEmptyString.optional(),
  roomId: nonEmptyString.optional(),
  author: z.string().trim().min(1).max(80).default("Guest"),
  message: z.string().trim().min(1).max(500),
});

export const likePayloadSchema = z.object({
  clientEventId: z.string().trim().max(120).optional(),
  liveSessionId: nonEmptyString.optional(),
  roomId: nonEmptyString.optional(),
  visitorId: z.string().trim().max(120).optional(),
});

export const liveSessionPayloadSchema = z.object({
  agentId: nonEmptyString.optional(),
  agentName: nonEmptyString.optional(),
  propertyId: nonEmptyString.optional(),
  propertyTitle: z.string().trim().min(2).max(160),
  propertyLocation: z.string().trim().min(2).max(160),
  propertyDescription: z.string().trim().max(2000).optional(),
  propertyImage: z.string().trim().url().optional(),
  roomId: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/i, "Room ID can only include letters, numbers, and dashes.")
    .max(120)
    .optional(),
  title: z.string().trim().min(2).max(160).optional(),
  startsAt: z.string().datetime().optional(),
  streamProvider: z.literal("mux").default("mux"),
});

const ALLOWED_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 * 1024;
const MIN_CHUNK_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_CHUNK_SIZE_BYTES = 100 * 1024 * 1024;

export const uploadInitSchema = z.object({
  streamId: nonEmptyString.optional(),
  propertyId: nonEmptyString.optional(),
  fileName: nonEmptyString.max(255),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE_BYTES, {
    message: `File size must not exceed ${MAX_FILE_SIZE_BYTES / 1024 / 1024 / 1024} GB.`,
  }),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({
      message: "File type must be video/mp4, video/quicktime, or video/webm.",
    }),
  }),
  totalChunks: z.number().int().min(1).max(10000),
  chunkSize: z
    .number()
    .int()
    .min(MIN_CHUNK_SIZE_BYTES, {
      message: "Chunk size must be at least 5 MB.",
    })
    .max(MAX_CHUNK_SIZE_BYTES, {
      message: "Chunk size must not exceed 100 MB.",
    }),
});
