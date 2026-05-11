"use client";

import Image from "next/image";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useTranslation } from "@/lib/i18n/client";

export function Header() {
  const t = useTranslation();

  const navItems = [
    { href: "/", label: t.nav.home },
    { href: "/reels", label: t.nav.propertyReels },
  ];

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
          <Button className="w-full sm:w-auto" href="/reels" size="sm">
            <Clapperboard aria-hidden className="size-4" />
            {t.common.watchReels}
          </Button>
        </div>
      </div>
    </header>
  );
}
