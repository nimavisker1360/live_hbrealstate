import { Clapperboard, UploadCloud } from "lucide-react";
import { AgentUploadsButton } from "@/components/sections/AgentUploadsButton";
import { Button } from "@/components/ui/Button";
import { isAgentDashboardEmail } from "@/lib/agent-dashboard-access";

type CTAButtonsProps = {
  agentUploadsLabel: string;
  viewerEmail?: string | null;
  viewReelsLabel: string;
};

export function CTAButtons({
  agentUploadsLabel,
  viewerEmail,
  viewReelsLabel,
}: CTAButtonsProps) {
  const canAccessDashboard = isAgentDashboardEmail(viewerEmail);

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button href="/reels" size="lg">
        <Clapperboard aria-hidden className="size-5" />
        {viewReelsLabel}
      </Button>
      {canAccessDashboard ? (
        <Button href="/agent/dashboard" size="lg" variant="secondary">
          <UploadCloud aria-hidden className="size-5" />
          {agentUploadsLabel}
        </Button>
      ) : (
        <AgentUploadsButton
          initialEmail={viewerEmail}
          label={agentUploadsLabel}
        />
      )}
    </div>
  );
}
