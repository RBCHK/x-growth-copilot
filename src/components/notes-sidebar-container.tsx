"use client";

import { useEffect, useState } from "react";
import { StickyNote } from "lucide-react";
import { useConversation } from "@/contexts/conversation-context";
import { NotesSidebar } from "@/components/notes-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const NOTES_PANEL_OPEN = "notes-panel-open";

const SIDEBAR_ANIMATION_MS = 300;
const MOBILE_BREAKPOINT = "(max-width: 1023px)";
const SIDEBAR_WIDTH = "w-80";
const SIDEBAR_WIDTH_LG = "lg:w-80";

export function NotesSidebarContainer() {
  const { notes } = useConversation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(notes.length > 0);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BREAKPOINT);
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (notes.length > 0) {
      setShouldRender(true);
      setIsOpen(true);
      // Двойной rAF: даём aside отрендериться с width=0, затем CSS transition анимирует до width=80
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true));
      });
      return () => cancelAnimationFrame(id);
    }
    // Сначала запускаем анимацию закрытия, потом размонтируем
    setMounted(false);
    const timer = setTimeout(() => setShouldRender(false), SIDEBAR_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [notes.length]);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener(NOTES_PANEL_OPEN, handler);
    return () => window.removeEventListener(NOTES_PANEL_OPEN, handler);
  }, []);

  const showPanel = shouldRender && (isOpen || !isMobile) && mounted;
  const showBackdrop = showPanel && isMobile;
  const showFab = notes.length > 0 && isMobile && !isOpen;

  if (!shouldRender) return null;

  return (
    <>
      {showBackdrop && (
        <button
          type="button"
          aria-label="Close notes"
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-out"
          onClick={() => setIsOpen(false)}
        />
      )}
      {showFab && (
        <Button
          variant="secondary"
          size="sm"
          className="fixed bottom-24 right-4 z-40 gap-2 shadow-lg lg:hidden"
          onClick={() => setIsOpen(true)}
        >
          <StickyNote className="h-4 w-4" />
          Notes ({notes.length})
        </Button>
      )}
      <aside
        data-state={showPanel ? "open" : "closed"}
        style={
          {
            "--tw-animation-duration": `${SIDEBAR_ANIMATION_MS}ms`,
            "--tw-duration": `${SIDEBAR_ANIMATION_MS}ms`,
            transition: `width ${SIDEBAR_ANIMATION_MS}ms ease-out`,
          } as React.CSSProperties
        }
        className={cn(
          "flex shrink-0 flex-col border-l border-border bg-background overflow-hidden",
          "max-lg:fixed max-lg:right-0 max-lg:top-0 max-lg:z-50 max-lg:h-full max-lg:w-full",
          "max-lg:data-[state=open]:animate-in max-lg:data-[state=closed]:animate-out",
          "max-lg:data-[state=open]:slide-in-from-right max-lg:data-[state=closed]:slide-out-to-right",
          "max-lg:data-[state=closed]:pointer-events-none",
          "lg:transition-[width] lg:ease-out",
          showPanel ? SIDEBAR_WIDTH_LG : "lg:w-0"
        )}
      >
        <div className={cn("flex h-full flex-col max-lg:w-full", SIDEBAR_WIDTH)}>
          <NotesSidebar onClose={isMobile ? () => setIsOpen(false) : undefined} />
        </div>
      </aside>
    </>
  );
}
