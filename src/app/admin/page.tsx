import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Building2,
  Crown,
  Radio,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const kpis = [
  {
    label: "Total agents",
    value: "128",
    detail: "18 active right now",
    icon: UsersRound,
  },
  {
    label: "Total live sessions",
    value: "742",
    detail: "36 scheduled this week",
    icon: Radio,
  },
  {
    label: "Total leads",
    value: "9,416",
    detail: "1,284 qualified",
    icon: BarChart3,
  },
  {
    label: "Estimated revenue",
    value: "$186k",
    detail: "+22% projected",
    icon: BadgeDollarSign,
  },
];

const agents = [
  {
    name: "Selin Kaya",
    company: "HB Real Estate Dubai",
    status: "active",
    plan: "Elite",
    leads: 384,
  },
  {
    name: "Mert Aydin",
    company: "Bosphorus Prime Homes",
    status: "active",
    plan: "Pro",
    leads: 271,
  },
  {
    name: "Nadia Hart",
    company: "London Collector Estates",
    status: "pending",
    plan: "Starter",
    leads: 94,
  },
  {
    name: "Karim Mansour",
    company: "Gulf Signature Realty",
    status: "paused",
    plan: "Pro",
    leads: 156,
  },
] as const;

const liveSessions = [
  {
    title: "Palm Residence Sky Villa",
    agent: "Selin Kaya",
    status: "live",
    viewers: 128,
    leads: 24,
  },
  {
    title: "Bosphorus Glass House",
    agent: "Mert Aydin",
    status: "scheduled",
    viewers: 42,
    leads: 8,
  },
  {
    title: "Chelsea Collector Loft",
    agent: "Nadia Hart",
    status: "ended",
    viewers: 214,
    leads: 31,
  },
  {
    title: "Jumeirah Garden Estate",
    agent: "Karim Mansour",
    status: "scheduled",
    viewers: 19,
    leads: 4,
  },
] as const;

const revenueStreams = [
  {
    label: "Subscription revenue",
    value: "$92,400",
    detail: "Monthly recurring plans from active agents",
  },
  {
    label: "Lead fee revenue",
    value: "$57,850",
    detail: "Qualified buyer lead fees across live sessions",
  },
  {
    label: "Featured listing revenue",
    value: "$35,900",
    detail: "Premium placements and promoted live rooms",
  },
];

const recentActivity = [
  {
    title: "Selin Kaya started a live session",
    meta: "Palm Residence Sky Villa - 128 viewers",
    time: "2 min ago",
  },
  {
    title: "New Elite subscription activated",
    meta: "HB Real Estate Dubai upgraded annual billing",
    time: "18 min ago",
  },
  {
    title: "31 leads exported",
    meta: "Chelsea Collector Loft follow-up list",
    time: "44 min ago",
  },
  {
    title: "Featured listing slot purchased",
    meta: "Bosphorus Glass House promoted for 7 days",
    time: "1 hr ago",
  },
  {
    title: "Agent account pending review",
    meta: "London Collector Estates submitted documents",
    time: "3 hrs ago",
  },
];

const statusStyles: Record<string, string> = {
  active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  ended: "border-white/15 bg-white/[0.06] text-white/62",
  live: "border-red-400/35 bg-red-500/12 text-red-100",
  paused: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  pending: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  scheduled: "border-violet-300/30 bg-violet-400/10 text-violet-100",
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
  icon: Icon,
  title,
  eyebrow,
}: {
  icon: typeof ShieldCheck;
  title: string;
  eyebrow: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
      </div>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#d6b15f]/25 bg-[#d6b15f]/10 text-[#d6b15f]">
        <Icon aria-hidden className="size-5" />
      </span>
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="bg-[#050505]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#d6b15f]">
            <ShieldCheck aria-hidden className="size-4" />
            Admin dashboard
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
            Platform owner overview
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/62">
            Monitor agents, live sessions, lead flow, and revenue performance
            with mock operational data.
          </p>
        </div>

        <section
          aria-label="Platform KPIs"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {kpis.map((kpi) => {
            const Icon = kpi.icon;

            return (
              <Card className="p-5" key={kpi.label}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/52">{kpi.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {kpi.value}
                    </p>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-md border border-[#d6b15f]/25 bg-[#d6b15f]/10 text-[#d6b15f]">
                    <Icon aria-hidden className="size-5" />
                  </span>
                </div>
                <p className="mt-4 text-sm text-white/58">{kpi.detail}</p>
              </Card>
            );
          })}
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="p-5">
            <SectionHeader
              eyebrow="Agents"
              icon={Building2}
              title="Agent accounts"
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/40">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Agent name</th>
                    <th className="pb-3 pr-4 font-semibold">Company</th>
                    <th className="pb-3 pr-4 font-semibold">Status</th>
                    <th className="pb-3 pr-4 font-semibold">
                      Subscription plan
                    </th>
                    <th className="pb-3 text-right font-semibold">
                      Total leads
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {agents.map((agent) => (
                    <tr key={agent.name}>
                      <td className="py-4 pr-4 font-medium text-white">
                        {agent.name}
                      </td>
                      <td className="py-4 pr-4 text-white/64">
                        {agent.company}
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge status={agent.status} />
                      </td>
                      <td className="py-4 pr-4 text-white/72">
                        {agent.plan}
                      </td>
                      <td className="py-4 text-right font-semibold text-white">
                        {agent.leads}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader
              eyebrow="Revenue model"
              icon={Crown}
              title="Estimated revenue streams"
            />
            <div className="space-y-3">
              {revenueStreams.map((stream) => (
                <div
                  className="rounded-md border border-white/10 bg-black/20 p-4"
                  key={stream.label}
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium text-white">{stream.label}</p>
                    <p className="shrink-0 font-semibold text-[#d6b15f]">
                      {stream.value}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/56">
                    {stream.detail}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="p-5">
            <SectionHeader
              eyebrow="Live sessions"
              icon={Radio}
              title="Session monitoring"
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/40">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Title</th>
                    <th className="pb-3 pr-4 font-semibold">Agent</th>
                    <th className="pb-3 pr-4 font-semibold">Status</th>
                    <th className="pb-3 pr-4 text-right font-semibold">
                      Viewers
                    </th>
                    <th className="pb-3 text-right font-semibold">Leads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {liveSessions.map((session) => (
                    <tr key={`${session.title}-${session.agent}`}>
                      <td className="py-4 pr-4 font-medium text-white">
                        {session.title}
                      </td>
                      <td className="py-4 pr-4 text-white/64">
                        {session.agent}
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="py-4 pr-4 text-right text-white/72">
                        {session.viewers}
                      </td>
                      <td className="py-4 text-right text-white/72">
                        {session.leads}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader
              eyebrow="Recent activity"
              icon={Activity}
              title="Platform feed"
            />
            <div className="space-y-4">
              {recentActivity.map((item) => (
                <div className="flex gap-3" key={`${item.title}-${item.time}`}>
                  <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md border border-[#d6b15f]/25 bg-[#d6b15f]/10 text-[#d6b15f]">
                    <Sparkles aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0 border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="shrink-0 text-xs text-white/42">
                        {item.time}
                      </p>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-white/56">
                      {item.meta}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
