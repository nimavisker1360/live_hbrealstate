import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const offerBody = z.object({
  buyerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(32),
  amount: z.union([z.string(), z.number()]),
  currency: z.enum(["USD", "EUR", "TRY"]).default("USD"),
  message: z.string().trim().max(1000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const tour = await prisma.videoTour.findUnique({
      where: { slug },
      select: { id: true, agentId: true },
    });

    if (!tour) {
      return jsonError("Reel not found.", 404);
    }

    const session = await getCurrentSession().catch(() => null);
    const body = offerBody.parse(await request.json());
    const rawAmount = String(body.amount).replace(/,/g, "").trim();

    if (!/^\d+(\.\d{1,2})?$/.test(rawAmount) || Number(rawAmount) <= 0) {
      return jsonError("Offer amount must be a positive number.", 400);
    }

    const offer = await prisma.videoTourOffer.create({
      data: {
        videoTourId: tour.id,
        agentId: tour.agentId,
        userId: session?.sub,
        buyerName: body.buyerName,
        phone: body.phone,
        amount: rawAmount,
        currency: body.currency,
        message: body.message,
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        createdAt: true,
      },
    });

    return Response.json(
      {
        data: {
          id: offer.id,
          amount: offer.amount.toString(),
          currency: offer.currency,
          createdAt: offer.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
