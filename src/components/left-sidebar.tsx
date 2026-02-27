"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, Settings, MessageSquare, FileText, AlignLeft, BookOpen, Clock, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SettingsSheet } from "@/components/settings-sheet";
import { getConversations, deleteConversation } from "@/app/actions/conversations";
import { getScheduledSlots, ensureSlotsForWeek } from "@/app/actions/schedule";
import type { ContentType, Draft, ScheduledSlot, SlotStatus } from "@/lib/types";

const contentTypeIcon: Record<ContentType, React.ReactNode> = {
  Reply: <MessageSquare className="h-3.5 w-3.5" />,
  Post: <FileText className="h-3.5 w-3.5" />,
  Thread: <AlignLeft className="h-3.5 w-3.5" />,
  Article: <BookOpen className="h-3.5 w-3.5" />,
};

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const d = date instanceof Date ? date : new Date(date);
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function slotStatusConfig(status: SlotStatus) {
  switch (status) {
    case "empty":
      return {
        icon: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
        className: "border border-border bg-muted/40",
        label: "Empty",
      };
    case "filled":
      return {
        icon: <Clock className="h-3.5 w-3.5 text-blue-400" />,
        className: "border border-border bg-blue-500/10",
        label: "Ready",
      };
    case "posted":
      return {
        icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
        className: "border border-border bg-emerald-500/10",
        label: "Posted",
      };
  }
}

function formatSlotDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

function groupSlotsByDate(slots: ScheduledSlot[]) {
  const groups: Record<string, ScheduledSlot[]> = {};
  for (const slot of slots) {
    const key = formatSlotDate(slot.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(slot);
  }
  return Object.entries(groups);
}

function DraftItem({
  draft,
  isActive,
  onDelete,
}: {
  draft: Draft;
  isActive: boolean;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    await onDelete(draft.id);
    if (isActive) router.push("/");
  }

  return (
    <div
      className={cn(
        "group relative flex w-full flex-col gap-2 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-accent",
        isActive && "bg-accent",
      )}
    >
      <button
        onClick={() => router.push(`/c/${draft.id}`)}
        className="flex flex-1 flex-col gap-2 text-left cursor-pointer"
      >
        <span className="line-clamp-1 text-sm font-medium pr-8">{draft.title}</span>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 text-xs font-normal">
            {contentTypeIcon[draft.contentType]}
            {draft.contentType}
          </Badge>
          {draft.status === "packaged" && (
            <Badge variant="outline" className="text-xs font-normal text-blue-400 border-blue-500/30">
              Packaged
            </Badge>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatRelativeDate(draft.updatedAt)}
          </span>
        </div>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleDelete}
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  );
}

function SlotItem({ slot }: { slot: ScheduledSlot }) {
  const config = slotStatusConfig(slot.status);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-150",
        config.className,
      )}
    >
      {config.icon}
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{slot.timeSlot}</span>
          <Badge variant="secondary" className="text-xs font-normal">
            {slot.slotType}
          </Badge>
        </div>
        {slot.draftTitle ? (
          <span className="line-clamp-1 text-xs text-muted-foreground">
            {slot.draftTitle}
          </span>
        ) : (
          <span className="text-xs italic text-muted-foreground/60">
            Empty slot
          </span>
        )}
      </div>
    </div>
  );
}

export function LeftSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [slots, setSlots] = useState<ScheduledSlot[]>([]);

  const activeDraftId = pathname.startsWith("/c/")
    ? pathname.split("/")[2]
    : null;

  useEffect(() => {
    getConversations().then(setDrafts).catch(() => setDrafts([]));
  }, [pathname]);

  useEffect(() => {
    ensureSlotsForWeek().then(() => getScheduledSlots().then(setSlots).catch(() => setSlots([])));
  }, []);

  useEffect(() => {
    const handler = () => getScheduledSlots().then(setSlots).catch(() => {});
    window.addEventListener("slots-updated", handler);
    return () => window.removeEventListener("slots-updated", handler);
  }, []);

  function refreshSlots() {
    getScheduledSlots().then(setSlots).catch(() => {});
  }

  function handleNewDraft() {
    router.push("/");
  }

  const groupedSlots = groupSlotsByDate(slots);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-medium tracking-[-0.02em]">x-growth</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewDraft}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <Tabs
        defaultValue="drafts"
        className="flex flex-1 flex-col overflow-hidden"
        onValueChange={(v) => v === "scheduled" && refreshSlots()}
      >
        <TabsList className="mx-3 mt-2 grid w-auto grid-cols-2">
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>

        <TabsContent value="drafts" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-2 py-2">
            <div className="flex flex-col gap-2">
              {drafts.map((draft) => (
                <DraftItem
                  key={draft.id}
                  draft={draft}
                  isActive={activeDraftId === draft.id}
                  onDelete={async (id) => {
                    try {
                      await deleteConversation(id);
                      setDrafts((prev) => prev.filter((d) => d.id !== id));
                      toast.success("Draft deleted");
                    } catch {
                      toast.error("Failed to delete draft");
                    }
                  }}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="scheduled" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-2 py-2">
            <div className="flex flex-col gap-4">
              {groupedSlots.map(([dateLabel, slotList]) => (
                <div key={dateLabel} className="flex flex-col gap-2">
                  <span className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {dateLabel}
                  </span>
                  {slotList.map((slot) => (
                    <SlotItem key={slot.id} slot={slot} />
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="p-4">
        <SettingsSheet>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </Button>
        </SettingsSheet>
      </div>
    </div>
  );
}
