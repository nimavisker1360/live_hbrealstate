"use client";

import { Clapperboard } from "lucide-react";
import { AgentUploadsButton } from "@/components/sections/AgentUploadsButton";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/client";

export function CTAButtons() {
  const t = useTranslation();

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button href="/reels" size="lg">
        <Clapperboard aria-hidden className="size-5" />
        {t.home.viewReels}
      </Button>
      <AgentUploadsButton />
    </div>
  );
}
