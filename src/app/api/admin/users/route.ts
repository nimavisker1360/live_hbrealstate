import { z } from "zod";
import { getAdminUserOrResponse } from "@/lib/admin-access";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createAgentSchema = z.object({
  agencyName: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(320),
  name: z.string().trim().min(2).max(160),
  passwordHash: z.string().trim().min(20).max(512),
  phone: z.string().trim().max(40).optional(),
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

export async function GET() {
  try {
    const admin = await getAdminUserOrResponse();

    if (admin.response) {
      return admin.response;
    }

    const users = await prisma.user.findMany({
      where: { role: "AGENT" },
      orderBy: { createdAt: "desc" },
      select: {
        agencyName: true,
        agent: {
          select: {
            id: true,
            company: true,
            status: true,
          },
        },
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

    return Response.json({ data: users.map(serializeUser) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminUserOrResponse();

    if (admin.response) {
      return admin.response;
    }

    const payload = createAgentSchema.parse(await request.json());

    if (payload.role === "ADMIN") {
      return jsonError("This endpoint cannot create admin users.", 400);
    }

    const email = payload.email.toLowerCase();
    const user = await prisma.user.create({
      data: {
        agencyName: payload.agencyName,
        email,
        name: payload.name,
        passwordHash: payload.passwordHash,
        phone: payload.phone,
        role: "AGENT",
        status: payload.status ?? "PENDING",
        agent: {
          create: {
            company: payload.agencyName ?? "HB Real Estate",
            name: payload.name,
            status: payload.status ?? "PENDING",
            subscriptionPlan: "PRO",
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

    return Response.json({ data: serializeUser(user) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
