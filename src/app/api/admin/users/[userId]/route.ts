import { z } from "zod";
import { getAdminUserOrResponse } from "@/lib/admin-access";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type SegmentData = {
  params: Promise<{ userId: string }>;
};

const updateAgentSchema = z.object({
  agencyName: z.string().trim().max(160).optional(),
  name: z.string().trim().min(2).max(160).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  role: z.string().optional(),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"]).optional(),
});

function serializeUser<T extends { createdAt: Date; updatedAt: Date }>(user: T) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function PATCH(request: Request, segmentData: SegmentData) {
  try {
    const admin = await getAdminUserOrResponse();

    if (admin.response) {
      return admin.response;
    }

    const { userId } = await segmentData.params;
    const payload = updateAgentSchema.parse(await request.json());

    if (payload.role === "ADMIN") {
      return jsonError("This endpoint cannot promote users to admin.", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!existingUser || existingUser.role !== "AGENT") {
      return jsonError("Agent user not found.", 404);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        agencyName: payload.agencyName,
        name: payload.name,
        phone: payload.phone,
        status: payload.status,
        agent: {
          upsert: {
            create: {
              company: payload.agencyName ?? "HB Real Estate",
              name: payload.name ?? "HB Real Estate Agent",
              status: payload.status ?? "PENDING",
              subscriptionPlan: "PRO",
            },
            update: {
              company: payload.agencyName,
              name: payload.name,
              status: payload.status,
            },
          },
        },
      },
      select: {
        agencyName: true,
        agent: { select: { id: true, company: true, status: true } },
        createdAt: true,
        email: true,
        id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return Response.json({ data: serializeUser(user) });
  } catch (error) {
    return handleApiError(error);
  }
}
