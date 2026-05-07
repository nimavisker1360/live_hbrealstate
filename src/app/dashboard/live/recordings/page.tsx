import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Database,
  FileVideo,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  LiveRecordingStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { RecordingRowActions } from "@/components/live/recordings/RecordingRowActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getRecordingDashboardUser } from "@/lib/live-recording-access";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Recordings | HB Dashboard",
};

type RecordingsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

const statusOptions = [
  "ALL",
  LiveRecordingStatus.LOCAL_PENDING,
  LiveRecordingStatus.UPLOADING,
  LiveRecordingStatus.UPLOADED,
  LiveRecordingStatus.FAILED,
  LiveRecordingStatus.PROCESSING,
  LiveRecordingStatus.READY,
] as const;

const statusStyles: Record<LiveRecordingStatus, string> = {
  FAILED: "border-red-400/30 bg-red-500/10 text-red-100",
  LOCAL_PENDING: "border-white/15 bg-white/[0.06] text-white/62",
  PROCESSING: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  READY: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  UPLOADED: "border-[#d6b15f]/35 bg-[#d6b15f]/10 text-[#f0cf79]",
  UPLOADING: "border-violet-300/30 bg-violet-400/10 text-violet-100",
};

function getValidStatus(value?: string) {
  const normalized = value?.trim().toUpperCase();

  if (!normalized || normalized === "ALL") {
    return undefined;
  }

  return normalized in LiveRecordingStatus
    ? (normalized as LiveRecordingStatus)
    : undefined;
}

function formatDate(value?: Date | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatStatus(status: LiveRecordingStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function getReplayUrl({
  id,
  status,
}: {
  id: string;
  status: LiveRecordingStatus;
}) {
  if (
    status !== LiveRecordingStatus.READY &&
    status !== LiveRecordingStatus.UPLOADED
  ) {
    return null;
  }

  return absoluteUrl(`/live/replay/${id}`);
}

function buildWhere({
  query,
  status,
  userId,
}: {
  query?: string;
  status?: LiveRecordingStatus;
  userId: string;
}) {
  const where: Prisma.LiveRecordingWhereInput = {
    userId,
    ...(status ? { status } : {}),
  };

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { fileName: { contains: query } },
      { property: { title: { contains: query } } },
      { property: { location: { contains: query } } },
      { stream: { title: { contains: query } } },
    ];
  }

  return where;
}

export default async function LiveRecordingsDashboardPage({
  searchParams,
}: RecordingsPageProps) {
  const writable = await getRecordingDashboardUser();

  if (writable.response) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const status = getValidStatus(params.status);
  const recordings = await prisma.liveRecording.findMany({
    where: buildWhere({
      query,
      status,
      userId: writable.user.sub,
    }),
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      errorMessage: true,
      fileName: true,
      playbackId: true,
      status: true,
      storageProvider: true,
      title: true,
      uploadProgress: true,
      uploadedAt: true,
      property: {
        select: {
          location: true,
          title: true,
        },
      },
      stream: {
        select: {
          title: true,
        },
      },
    },
  });
  const totals = recordings.reduce(
    (acc, recording) => {
      acc.total += 1;

      if (recording.status === LiveRecordingStatus.READY) {
        acc.ready += 1;
      }

      if (recording.status === LiveRecordingStatus.FAILED) {
        acc.failed += 1;
      }

      return acc;
    },
    { failed: 0, ready: 0, total: 0 },
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
              <Database aria-hidden className="size-4" />
              Live archive
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
              Uploaded recordings
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
              Review uploaded live videos, monitor recovery progress, and open
              replay pages when recordings are available.
            </p>
          </div>
          <Button href="/dashboard/live/upload-recovery" variant="secondary">
            <FileVideo aria-hidden className="size-4" />
            Upload recovery
          </Button>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Total" value={totals.total} />
          <Metric label="Ready" value={totals.ready} />
          <Metric label="Failed" value={totals.failed} tone="alert" />
        </div>

        <Card className="mb-5 p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" method="GET">
            <label className="relative block">
              <Search
                aria-hidden
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/34"
              />
              <input
                className="h-11 w-full rounded-md border border-white/10 bg-black/42 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#d6b15f] focus:ring-2 focus:ring-[#d6b15f]/20"
                defaultValue={query ?? ""}
                name="q"
                placeholder="Search title, file, property"
              />
            </label>
            <select
              className="h-11 rounded-md border border-white/10 bg-black px-3 text-sm text-white outline-none transition focus:border-[#d6b15f] focus:ring-2 focus:ring-[#d6b15f]/20"
              defaultValue={status ?? "ALL"}
              name="status"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "All statuses" : formatStatus(option)}
                </option>
              ))}
            </select>
            <Button className="h-11" type="submit">
              Filter
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-white/42">
                <tr>
                  <Th>Title</Th>
                  <Th>File name</Th>
                  <Th>Status</Th>
                  <Th>Upload progress</Th>
                  <Th>Storage</Th>
                  <Th>Created</Th>
                  <Th>Uploaded</Th>
                  <Th>Replay URL</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {recordings.map((recording) => {
                  const title =
                    recording.title ??
                    recording.stream?.title ??
                    recording.property?.title ??
                    "Untitled recording";
                  const replayUrl = getReplayUrl(recording);

                  return (
                    <tr
                      className="align-top transition hover:bg-white/[0.025]"
                      key={recording.id}
                    >
                      <Td>
                        <div className="max-w-56">
                          <p className="font-semibold text-white">{title}</p>
                          <p className="mt-1 line-clamp-1 text-xs text-white/46">
                            {recording.property
                              ? `${recording.property.title} - ${recording.property.location}`
                              : "No property linked"}
                          </p>
                        </div>
                      </Td>
                      <Td>
                        <span className="block max-w-48 truncate text-white/72">
                          {recording.fileName}
                        </span>
                      </Td>
                      <Td>
                        <StatusBadge status={recording.status} />
                        {recording.errorMessage ? (
                          <p className="mt-2 max-w-44 text-xs leading-5 text-red-200">
                            {recording.errorMessage}
                          </p>
                        ) : null}
                      </Td>
                      <Td>
                        <Progress value={recording.uploadProgress} />
                      </Td>
                      <Td>{recording.storageProvider ?? "Not set"}</Td>
                      <Td>{formatDate(recording.createdAt)}</Td>
                      <Td>{formatDate(recording.uploadedAt)}</Td>
                      <Td>
                        {replayUrl ? (
                          <Link
                            className="inline-flex max-w-48 items-center gap-1 truncate text-[#f0cf79] hover:text-white"
                            href={replayUrl}
                            target="_blank"
                          >
                            <span className="truncate">{replayUrl}</span>
                            <ArrowUpRight
                              aria-hidden
                              className="size-3.5 shrink-0"
                            />
                          </Link>
                        ) : (
                          <span className="text-white/38">Not ready</span>
                        )}
                      </Td>
                      <Td>
                        <RecordingRowActions
                          canRetry={recording.status === LiveRecordingStatus.FAILED}
                          recordingId={recording.id}
                          title={title}
                        />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {recordings.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-[#f0cf79]">
                <ShieldAlert aria-hidden className="size-6" />
              </div>
              <p className="text-lg font-semibold text-white">
                No recordings found
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/52">
                Try a different filter or upload a saved live recording from the
                recovery page.
              </p>
            </div>
          ) : null}
        </Card>

        <p className="mt-4 text-xs leading-5 text-white/42">
          Delete removes PostgreSQL metadata only. Stored video files are left in
          place unless a separate storage deletion flow is explicitly confirmed.
        </p>
      </div>
    </main>
  );
}

function Metric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "alert";
  value: number;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold",
          tone === "alert" ? "text-red-100" : "text-white",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

function StatusBadge({ status }: { status: LiveRecordingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold",
        statusStyles[status],
      )}
    >
      {formatStatus(status)}
    </span>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="w-36">
      <div className="mb-1 flex items-center justify-between text-xs text-white/52">
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#d6b15f]"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-4 text-white/62">{children}</td>;
}
