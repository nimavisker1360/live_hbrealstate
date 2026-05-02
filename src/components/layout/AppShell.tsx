"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLiveRoom = /^\/live\/[^/]+/.test(pathname);

  return (
    <>
      {!isLiveRoom ? <Header /> : null}
      <main className={cn("flex-1", isLiveRoom && "min-h-svh")}>
        {children}
      </main>
      {!isLiveRoom ? <Footer /> : null}
    </>
  );
}
