"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthTokenSync } from "@/components/layout/AuthTokenSync";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isReelViewer = /^\/reels\/[^/]+/.test(pathname);

  return (
    <>
      <AuthTokenSync />
      {!isReelViewer ? <Header /> : null}
      <main className={cn("flex-1", isReelViewer && "min-h-svh")}>
        {children}
      </main>
      {!isReelViewer ? <Footer /> : null}
    </>
  );
}
