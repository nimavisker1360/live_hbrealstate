import { Clapperboard, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { canAccessAgentDashboard } from "@/lib/agent-dashboard-access";
import { getCurrentSession } from "@/lib/auth";

export async function CTAButtons() {
  const session = await getCurrentSession().catch(() => null);
  const showAgentUploads = canAccessAgentDashboard(session);

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button href="/reels" size="lg">
        <Clapperboard aria-hidden className="size-5" />
        View property reels
      </Button>
      {showAgentUploads ? (
        <Button href="/agent/dashboard" size="lg" variant="secondary">
          <UploadCloud aria-hidden className="size-5" />
          Agent uploads
        </Button>
      ) : null}
    </div>
  );
}
