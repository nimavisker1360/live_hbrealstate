import { Clapperboard, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CTAButtons() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button href="/reels" size="lg">
        <Clapperboard aria-hidden className="size-5" />
        View property reels
      </Button>
      <Button href="/agent/dashboard" size="lg" variant="secondary">
        <UploadCloud aria-hidden className="size-5" />
        Agent uploads
      </Button>
    </div>
  );
}
