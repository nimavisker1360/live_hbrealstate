import { Clapperboard } from "lucide-react";
import { AgentUploadsButton } from "@/components/sections/AgentUploadsButton";
import { Button } from "@/components/ui/Button";
import { getAgentDashboardEmails } from "@/lib/agent-dashboard-access";

export function CTAButtons() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button href="/reels" size="lg">
        <Clapperboard aria-hidden className="size-5" />
        View property reels
      </Button>
      <AgentUploadsButton allowedEmails={getAgentDashboardEmails()} />
    </div>
  );
}
