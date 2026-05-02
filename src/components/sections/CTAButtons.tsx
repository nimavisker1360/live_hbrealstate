import { CalendarCheck, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CTAButtons() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button href="/live" size="lg">
        <MonitorPlay aria-hidden className="size-5" />
        View live tours
      </Button>
      <Button href="/live" size="lg" variant="secondary">
        <CalendarCheck aria-hidden className="size-5" />
        Upcoming tours
      </Button>
    </div>
  );
}
