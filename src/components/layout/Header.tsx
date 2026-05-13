"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Clapperboard, LayoutDashboard, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useTranslation } from "@/lib/i18n/client";

type HeaderSession = {
  role: string;
  status?: string;
} | null;

export function Header() {
  const t = useTranslation();
  const [session, setSession] = useState<HeaderSession>(null);

  const navItems = [
    { href: "/", label: t.nav.home },
    { href: "/reels", label: t.nav.propertyReels },
  ];
  const isActivePrivilegedSession =
    session?.status === "ACTIVE" &&
    (session.role === "ADMIN" || session.role === "AGENT");
  const dashboardHref = session?.role === "ADMIN" ? "/admin" : "/agent/dashboard";

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const payload = (await response.json()) as {
          data?: { session?: HeaderSession };
        };

        if (!ignore) {
          setSession(payload.data?.session ?? null);
        }
      } catch {
        if (!ignore) {
          setSession(null);
        }
      }
    }

    loadSession();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex h-11 w-24 items-center justify-center overflow-hidden rounded-md border border-[#d6b15f]/35 bg-black">
            <Image
              alt="HB Real Estate logo"
              className="size-full object-contain p-1"
              height={44}
              priority
              src="/logo_white.png"
              width={96}
            />
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-white/68">
            {navItems.map((item) => (
              <Link
                className="rounded-md px-3 py-2 transition hover:bg-white/[0.06] hover:text-white"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <LanguageSwitcher />
          {isActivePrivilegedSession ? (
            <>
              <Button className="w-full sm:w-auto" href={dashboardHref} size="sm" variant="secondary">
                <LayoutDashboard aria-hidden className="size-4" />
                Dashboard
              </Button>
              <form action="/api/auth/logout" method="get">
                <input name="next" type="hidden" value="/login" />
                <button
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#d6b15f] focus:ring-offset-2 focus:ring-offset-black sm:w-auto"
                  type="submit"
                >
                  <LogOut aria-hidden className="size-4" />
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Button className="w-full sm:w-auto" href="/login" size="sm" variant="secondary">
              <LogIn aria-hidden className="size-4" />
              Login
            </Button>
          )}
          <Button className="w-full sm:w-auto" href="/reels" size="sm">
            <Clapperboard aria-hidden className="size-4" />
            {t.common.watchReels}
          </Button>
        </div>
      </div>
    </header>
  );
}
