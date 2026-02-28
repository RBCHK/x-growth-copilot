"use client";

import Link from "next/link";

export function AppHeader() {
  return (
    <header className="flex h-[64px] min-h-[64px] shrink-0 items-center  bg-background px-6">
      <Link
        href="/"
        className="text-lg font-semibold tracking-tight text-foreground hover:text-foreground/90 transition-colors"
      >
        X Growth Copilot
      </Link>
    </header>
  );
}
