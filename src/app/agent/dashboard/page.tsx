import {
  BadgeDollarSign,
  CalendarClock,
  Eye,
  MessageCircle,
  Plus,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const overviewCards = [
  {
    label: "Total live views",
    value: "2,846",
    detail: "+18% from last month",
    icon: Eye,
  },
  {
    label: "Total leads",
    value: "184",
    detail: "42 new this week",
    icon: UsersRound,
  },
  {
    label: "Total offers",
    value: "27",
    detail: "$18.4M total value",
    icon: BadgeDollarSign,
  },
  {
    label: "WhatsApp clicks",
    value: "316",
    detail: "68 high-intent taps",
    icon: MessageCircle,
  },
];

const liveSessions = [
  {
    title: "Palm Residence Sky Villa",
    status: "live",
    viewers: 128,
    leads: 24,
    date: "May 1, 2026",
  },
  {
    title: "Bosphorus Glass House",
    status: "scheduled",
    viewers: 42,
    leads: 8,
    date: "May 2, 2026",
  },
  {
    title: "Chelsea Collector Loft",
    status: "ended",
    viewers: 214,
    leads: 31,
    date: "Apr 29, 2026",
  },
  {
    title: "Palm Jumeirah Garden Estate",
    status: "scheduled",
    viewers: 19,
    leads: 4,
    date: "May 5, 2026",
  },
] as const;

const leads = [
  {
    name: "Aylin Demir",
    phone: "+90 532 441 20 18",
    interest: "Palm Residence Sky Villa",
    budget: "$4.5M - $5M",
    status: "qualified",
  },
  {
    name: "Karim Haddad",
    phone: "+971 55 210 8841",
    interest: "Dubai Marina penthouse",
    budget: "$3M - $4M",
    status: "contacted",
  },
  {
    name: "Mina Laurent",
    phone: "+44 7700 900314",
    interest: "Chelsea Collector Loft",
    budget: "$2.8M - $3.6M",
    status: "new",
  },
  {
    name: "Omar Aksoy",
    phone: "+90 555 019 44 27",
    interest: "Bosphorus waterfront homes",
    budget: "$6M - $8M",
    status: "lost",
  },
] as const;

const offers = [
  {
    property: "Palm Residence Sky Villa",
    amount: "$4,650,000",
    buyer: "Aylin Demir",
    phone: "+90 532 441 20 18",
    status: "under review",
  },
  {
    property: "Bosphorus Glass House",
    amount: "$6,950,000",
    buyer: "Omar Aksoy",
    phone: "+90 555 019 44 27",
    status: "countered",
  },
  {
    property: "Chelsea Collector Loft",
    amount: "$3,380,000",
    buyer: "Mina Laurent",
    phone: "+44 7700 900314",
    status: "accepted",
  },
] as const;

const properties = [
  {
    name: "Palm Residence Sky Villa",
    location: "Dubai Marina, UAE",
    price: "$4,850,000",
    activity: "1 live now",
  },
  {
    name: "Bosphorus Glass House",
    location: "Bebek, Istanbul",
    price: "$7,200,000",
    activity: "Next: May 2",
  },
  {
    name: "Chelsea Collector Loft",
    location: "London, UK",
    price: "$3,450,000",
    activity: "31 leads",
  },
] as const;

const statusStyles: Record<string, string> = {
  accepted: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  contacted: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  countered: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  ended: "border-white/15 bg-white/[0.06] text-white/62",
  live: "border-red-400/35 bg-red-500/12 text-red-100",
  lost: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  new: "border-[#d6b15f]/35 bg-[#d6b15f]/10 text-[#f0cf79]",
  qualified: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  scheduled: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  "under review": "border-[#d6b15f]/35 bg-[#d6b15f]/10 text-[#f0cf79]",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold capitalize",
        statusStyles[status] ?? "border-white/15 bg-white/[0.06] text-white/70",
      )}
    >
      {status}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
    </div>
  );
}

export default function AgentDashboardPage() {
  return (
    <div className="bg-[#050505]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#d6b15f]">
              <CalendarClock aria-hidden className="size-4" />
              Agent dashboard
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
              Live sales command center
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/62">
              Monitor live sessions, buyer demand, property activity, and offer
              follow-ups from one mock-data workspace.
            </p>
          </div>
          <Button className="w-full sm:w-auto" href="/live">
            <Plus aria-hidden className="size-4" />
            Create New Live
          </Button>
        </div>

        <section
          aria-label="Overview"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {overviewCards.map((card) => {
            const Icon = card.icon;

            return (
              <Card className="p-5" key={card.label}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/52">{card.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {card.value}
                    </p>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-md border border-[#d6b15f]/25 bg-[#d6b15f]/10 text-[#d6b15f]">
                    <Icon aria-hidden className="size-5" />
                  </span>
                </div>
                <p className="mt-4 text-sm text-white/58">{card.detail}</p>
              </Card>
            );
          })}
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="p-5">
            <SectionHeader eyebrow="Live sessions" title="Session performance" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/40">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Title</th>
                    <th className="pb-3 pr-4 font-semibold">Status</th>
                    <th className="pb-3 pr-4 text-right font-semibold">
                      Viewers
                    </th>
                    <th className="pb-3 pr-4 text-right font-semibold">
                      Leads
                    </th>
                    <th className="pb-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {liveSessions.map((session) => (
                    <tr key={`${session.title}-${session.date}`}>
                      <td className="py-4 pr-4 font-medium text-white">
                        {session.title}
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="py-4 pr-4 text-right text-white/72">
                        {session.viewers}
                      </td>
                      <td className="py-4 pr-4 text-right text-white/72">
                        {session.leads}
                      </td>
                      <td className="py-4 text-white/62">{session.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader eyebrow="Properties" title="Active inventory" />
            <div className="space-y-3">
              {properties.map((property) => (
                <div
                  className="rounded-md border border-white/10 bg-black/20 p-4"
                  key={property.name}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{property.name}</p>
                      <p className="mt-1 text-sm text-white/52">
                        {property.location}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[#d6b15f]">
                      {property.price}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-white/56">
                    {property.activity}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card className="p-5">
            <SectionHeader eyebrow="Leads" title="Buyer pipeline" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/40">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Name</th>
                    <th className="pb-3 pr-4 font-semibold">Phone</th>
                    <th className="pb-3 pr-4 font-semibold">Interest</th>
                    <th className="pb-3 pr-4 font-semibold">Budget</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {leads.map((lead) => (
                    <tr key={lead.phone}>
                      <td className="py-4 pr-4 font-medium text-white">
                        {lead.name}
                      </td>
                      <td className="py-4 pr-4 text-white/62">{lead.phone}</td>
                      <td className="py-4 pr-4 text-white/72">
                        {lead.interest}
                      </td>
                      <td className="py-4 pr-4 text-white/72">
                        {lead.budget}
                      </td>
                      <td className="py-4">
                        <StatusBadge status={lead.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader eyebrow="Offers" title="Negotiation tracker" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/40">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Property</th>
                    <th className="pb-3 pr-4 font-semibold">Offer amount</th>
                    <th className="pb-3 pr-4 font-semibold">Buyer name</th>
                    <th className="pb-3 pr-4 font-semibold">Phone</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {offers.map((offer) => (
                    <tr key={`${offer.property}-${offer.buyer}`}>
                      <td className="py-4 pr-4 font-medium text-white">
                        {offer.property}
                      </td>
                      <td className="py-4 pr-4 font-semibold text-[#d6b15f]">
                        {offer.amount}
                      </td>
                      <td className="py-4 pr-4 text-white/72">
                        {offer.buyer}
                      </td>
                      <td className="py-4 pr-4 text-white/62">
                        {offer.phone}
                      </td>
                      <td className="py-4">
                        <StatusBadge status={offer.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
