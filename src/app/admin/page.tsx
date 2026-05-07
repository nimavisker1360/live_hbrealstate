import {
  BadgeDollarSign,
  BarChart3,
  Building2,
  Clapperboard,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  ended: "border-white/15 bg-white/[0.06] text-white/62",
  paused: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  pending: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  published: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
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

function formatReelStatus(recordingPlaybackId: string | null) {
  return recordingPlaybackId ? "published" : "draft";
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

export default async function AdminPage() {
  const [agents, liveSessions, totalLeads] = await Promise.all([
    prisma.agent.findMany({
      include: {
        _count: {
          select: { leads: true },
        },
      },
      take: 20,
    }),
    prisma.liveSession.findMany({
      select: {
        agent: { select: { name: true } },
        id: true,
        recordingPlaybackId: true,
        title: true,
        viewers: true,
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.lead.count(),
  ]);

  const kpis = [
    {
      label: "Total agents",
      value: agents.length.toString(),
      detail: `${agents.filter((a) => a.status === "ACTIVE").length} active`,
      icon: UsersRound,
    },
    {
      label: "Total property reels",
      value: liveSessions.length.toString(),
      detail: `${liveSessions.filter((s) => s.recordingPlaybackId).length} published`,
      icon: Clapperboard,
    },
    {
      label: "Total leads",
      value: totalLeads.toString(),
      detail: "From all reels",
      icon: BarChart3,
    },
    {
      label: "Avg views per reel",
      value: liveSessions.length > 0
        ? Math.round(
            liveSessions.reduce((sum, s) => sum + s.viewers, 0) /
              liveSessions.length,
          ).toString()
        : "0",
      detail: "Across all reels",
      icon: BadgeDollarSign,
    },
  ];

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
            Monitor agents, property reels, lead flow, and performance with
            data from your database.
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
              <table className="w-full min-w-180 text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/40">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Agent name</th>
                    <th className="pb-3 pr-4 font-semibold">Company</th>
                    <th className="pb-3 pr-4 font-semibold">Status</th>
                    <th className="pb-3 pr-4 font-semibold">Plan</th>
                    <th className="pb-3 text-right font-semibold">
                      Total leads
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {agents.map((agent) => (
                    <tr key={agent.id}>
                      <td className="py-4 pr-4 font-medium text-white">
                        {agent.name}
                      </td>
                      <td className="py-4 pr-4 text-white/64">
                        {agent.company}
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge status={agent.status.toLowerCase()} />
                      </td>
                      <td className="py-4 pr-4 text-white/72">
                        {agent.subscriptionPlan}
                      </td>
                      <td className="py-4 text-right font-semibold text-white">
                        {agent._count.leads}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {agents.length === 0 && (
                <div className="py-8 text-center text-sm text-white/52">
                  No agents yet.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader
              eyebrow="Reels"
              icon={Clapperboard}
              title="Top performers"
            />
            <div className="space-y-3">
              {liveSessions.slice(0, 5).map((session) => (
                <div
                  className="rounded-md border border-white/10 bg-black/20 p-4"
                  key={session.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium text-white">{session.title}</p>
                    <p className="shrink-0 font-semibold text-[#d6b15f]">
                      {session.viewers} views
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-white/56">
                    {session._count.leads} leads • {session.agent.name}
                  </p>
                </div>
              ))}
              {liveSessions.length === 0 && (
                <div className="py-8 text-center text-sm text-white/52">
                  No property reels yet.
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="p-5">
            <SectionHeader
              eyebrow="Property reels"
              icon={Clapperboard}
              title="All reels"
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-170 text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/40">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Title</th>
                    <th className="pb-3 pr-4 font-semibold">Agent</th>
                    <th className="pb-3 pr-4 font-semibold">Status</th>
                    <th className="pb-3 pr-4 text-right font-semibold">
                      Views
                    </th>
                    <th className="pb-3 text-right font-semibold">Leads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {liveSessions.map((session) => (
                    <tr key={session.id}>
                      <td className="py-4 pr-4 font-medium text-white">
                        {session.title}
                      </td>
                      <td className="py-4 pr-4 text-white/64">
                        {session.agent.name}
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge
                          status={formatReelStatus(session.recordingPlaybackId)}
                        />
                      </td>
                      <td className="py-4 pr-4 text-right text-white/72">
                        {session.viewers}
                      </td>
                      <td className="py-4 text-right text-white/72">
                        {session._count.leads}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {liveSessions.length === 0 && (
                <div className="py-8 text-center text-sm text-white/52">
                  No property reels yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
