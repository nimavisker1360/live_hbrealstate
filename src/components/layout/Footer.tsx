"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/client";

export function Footer() {
  const t = useTranslation();

  return (
    <footer className="border-t border-white/10 bg-[#050505]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-white/58 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <p className="font-semibold uppercase tracking-[0.22em] text-[#d6b15f]">
            {t.footer.brand}
          </p>
          <p className="mt-3 max-w-md leading-6">{t.footer.tagline}</p>
        </div>
        <div>
          <p className="font-semibold text-white">{t.footer.platform}</p>
          <div className="mt-3 grid gap-2">
            <Link className="hover:text-white" href="/reels">
              {t.footer.propertyReels}
            </Link>
          </div>
        </div>
        <div>
          <p className="font-semibold text-white">{t.footer.status}</p>
          <p className="mt-3 leading-6">{t.footer.statusText}</p>
        </div>
      </div>
    </footer>
  );
}
