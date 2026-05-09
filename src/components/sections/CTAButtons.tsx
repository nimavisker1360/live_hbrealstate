import { Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CTAButtons() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button href="/reels" size="lg">
        <Clapperboard aria-hidden className="size-5" />
        View property reels
      </Button>
    </div>
  );
}
