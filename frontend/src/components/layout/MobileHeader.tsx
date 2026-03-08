"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMobileNav } from "@/contexts/MobileNavContext";

export function MobileHeader() {
  const { toggleSidebar } = useMobileNav();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-primary/20 bg-background/95 px-4 backdrop-blur shadow-[0_0_30px_hsl(180_100%_50%_/_0.04)] lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={toggleSidebar}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Link href="/dashboard" className="font-display text-sm font-bold tracking-wider text-primary truncate">
        PULSEMETRICS
      </Link>
      <div className="w-9" /> {/* Spacer for centering */}
    </header>
  );
}
