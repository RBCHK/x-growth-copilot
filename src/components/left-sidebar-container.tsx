"use client";

import { useState } from "react";
import { LeftSidebar } from "@/components/left-sidebar";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 420;
const COLLAPSED_WIDTH = 55;

export function LeftSidebarContainer() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="hidden md:flex shrink-0">
      <div
        className="flex flex-col bg-sidebar overflow-hidden transition-[width] duration-300 ease-in-out"
        style={{ width: isOpen ? SIDEBAR_WIDTH : COLLAPSED_WIDTH }}
      >
        <LeftSidebar collapsed={!isOpen} onExpand={() => setIsOpen(true)} />
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsOpen((v) => !v);
        }}
        className={cn(
          "w-3 shrink-0 border-l border-border",
          "hover:border-l-2 hover:border-primary/50 transition-[border-width,border-color] duration-100",
          "focus-visible:outline-none focus-visible:border-l-2 focus-visible:border-primary",
          isOpen ? "cursor-w-resize" : "cursor-e-resize",
        )}
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      />
    </div>
  );
}
