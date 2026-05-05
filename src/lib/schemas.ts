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
