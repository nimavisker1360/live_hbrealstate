import { handleApiError } from "@/lib/api";
import { createLeadAndSendEmail } from "@/lib/lead-service";

export async function POST(request: Request) {
  try {
    const lead = await createLeadAndSendEmail(await request.json());

    return Response.json({ data: lead }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
