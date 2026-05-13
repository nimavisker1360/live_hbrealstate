import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Sparkles } from "lucide-react";
import { LoginForm } from "@/app/login/LoginForm";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function dashboardPathForSession(session: { role: string; status?: string }) {
  if (session.status !== "ACTIVE") {
    return null;
  }

  if (session.role === "ADMIN") {
    return "/admin";
  }

  if (session.role === "AGENT") {
    return "/agent/dashboard";
  }

  return null;
}

export default async function LoginPage() {
  const session = await getCurrentSession().catch(() => null);
  const dashboardPath = session ? dashboardPathForSession(session) : null;

  if (dashboardPath) {
    redirect(dashboardPath);
  }

  const adminExists = await prisma.user
    .count({ where: { role: "ADMIN", status: "ACTIVE" } })
    .then((count) => count > 0)
    .catch(() => false);

  return (
    <section className="relative isolate min-h-[calc(100svh-73px)] overflow-hidden bg-[#050505]">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(214,177,95,0.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_38%),#050505]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.92))]"
      />

      <div className="relative mx-auto grid min-h-[calc(100svh-73px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_440px] lg:px-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#d6b15f]/28 bg-[#d6b15f]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#f0cf79]">
            <ShieldCheck aria-hidden className="size-4" />
            Private access
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-normal text-white sm:text-5xl">
            HB Property Reels
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/68">
            Sign in with your approved HB agent or admin account to manage
            luxury property reels, leads, offers, and live viewing activity.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/64">
            <span className="rounded-md border border-white/10 bg-white/[0.045] px-3 py-2">
              Agent dashboard
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.045] px-3 py-2">
              Admin review
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.045] px-3 py-2">
              Secure session
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/72 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <span className="flex h-12 w-28 items-center justify-center overflow-hidden rounded-md border border-[#d6b15f]/35 bg-black">
              <Image
                alt="HB Real Estate logo"
                className="size-full object-contain p-1"
                height={48}
                priority
                src="/logo_white.png"
                width={112}
              />
            </span>
            <span className="flex size-10 items-center justify-center rounded-md border border-[#d6b15f]/25 bg-[#d6b15f]/10 text-[#d6b15f]">
              <Sparkles aria-hidden className="size-5" />
            </span>
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
              Sign in
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Agent and admin login
            </h2>
          </div>

          <LoginForm />

          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-white/55">
            {adminExists ? (
              <Link
                className="inline-flex items-center justify-between rounded-md border border-white/10 bg-white/[0.045] px-4 py-3 text-white/78 transition hover:border-[#d6b15f]/50 hover:text-white"
                href="/admin"
              >
                <span>Admin shortcut</span>
                <span className="text-[#d6b15f]">/admin</span>
              </Link>
            ) : null}
            <p>
              Accounts must be active before dashboard access is opened by HB
              administration.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
