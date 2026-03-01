"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Settings, Clock, CheckCircle2, Circle, Trash2, MoreHorizontal, Star, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SettingsSheet } from "@/components/settings-sheet";
import { ContentTypeDropdown } from "@/components/content-type-dropdown";
import { SendMessageButton } from "@/components/send-message-button";
import { getConversations, createConversation, deleteConversation, updateConversation } from "@/app/actions/conversations";
import { getScheduledSlots, ensureSlotsForWeek } from "@/app/actions/schedule";
import type { ContentType, Draft, ScheduledSlot, SlotStatus } from "@/lib/types";

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
  isEditing,
  onDelete,
  onContentTypeChange,
  onTitleSave,
  onStartEditing,
}: {
  draft: Draft;
  isActive: boolean;
  isEditing?: boolean;
  onDelete: (id: string) => void;
  onContentTypeChange: (id: string, contentType: ContentType) => void;
  onTitleSave?: (id: string, title: string) => void;
  onStartEditing?: (id: string) => void;
}) {
  const router = useRouter();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [editTitle, setEditTitle] = useState(draft.title);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setEditTitle(draft.title);
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  function handleDelete() {
    onDelete(draft.id);
    if (isActive) router.push("/");
  }

  function handleTitleSave() {
    const trimmed = editTitle.trim() || "Untitled";
    onTitleSave?.(draft.id, trimmed);
  }

  return (
    <div
      className={cn(
        "group relative flex w-full flex-col gap-2 rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
        isActive ? "bg-accent" : "hover:bg-muted/50",
      )}
    >
      <div
        role={isEditing ? undefined : "button"}
        tabIndex={isEditing ? undefined : 0}
        onClick={() => !isEditing && router.push(`/c/${draft.id}`)}
        onKeyDown={(e) => {
          if (!isEditing && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            router.push(`/c/${draft.id}`);
          }
        }}
        className={cn("flex flex-1 flex-col gap-3 text-left", !isEditing && "cursor-pointer")}
      >
        {isEditing ? (
          <input
            ref={titleInputRef}
            className="text-sm font-medium pr-8 leading-snug bg-transparent border-none outline-none w-full placeholder:text-muted-foreground/50"
            value={editTitle}
            placeholder="Untitled"
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); titleInputRef.current?.blur(); }
              else if (e.key === "Escape") { titleInputRef.current?.blur(); }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="line-clamp-2 text-sm font-medium pr-8 leading-snug"
            onDoubleClick={(e) => { e.stopPropagation(); onStartEditing?.(draft.id); }}
          >
            {draft.title}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatRelativeDate(draft.updatedAt)}
          </span>
          <div className="ml-auto flex items-center gap-5" onClick={(e) => e.stopPropagation()}>
            <ContentTypeDropdown
              variant="badge"
              value={draft.contentType}
              onValueChange={(type) => onContentTypeChange(draft.id, type)}
            />
            <SendMessageButton size="sm" />
            {draft.status === "packaged" && (
              <Badge variant="outline" className="text-xs font-normal text-blue-400 border-blue-500/30">
                Packaged
              </Badge>
            )}
          </div>
        </div>
      </div>
      <DropdownMenu onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-2 top-2 h-6 w-6 transition-opacity",
              menuOpen || isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
            <Star className="h-4 w-4" />
            Star
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartEditing?.(draft.id); }}>
            <Pencil className="h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="absolute bottom-0 left-[3%] right-[3%] h-px bg-border" />
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
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

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

  useEffect(() => {
    const handler = () => getConversations().then(setDrafts).catch(() => {});
    window.addEventListener("drafts-updated", handler);
    return () => window.removeEventListener("drafts-updated", handler);
  }, []);

  function refreshSlots() {
    getScheduledSlots().then(setSlots).catch(() => {});
  }

  async function handleNewDraft() {
    try {
      const id = await createConversation({ title: "Untitled" });
      const newDraft: Draft = { id, title: "Untitled", contentType: "Reply", status: "draft", updatedAt: new Date() };
      setDrafts((prev) => [newDraft, ...prev]);
      setEditingDraftId(id);
      router.push(`/c/${id}`);
    } catch {
      toast.error("Failed to create draft");
    }
  }

  async function handleTitleSave(id: string, title: string) {
    try {
      await updateConversation(id, { title });
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, title } : d)));
    } catch {
      toast.error("Failed to save title");
    } finally {
      setEditingDraftId(null);
    }
  }

  const groupedSlots = groupSlotsByDate(slots);

  return (
    <div className="flex h-full flex-col">
      <Tabs
        defaultValue="drafts"
        className="flex flex-1 flex-col overflow-hidden"
        onValueChange={(v) => v === "scheduled" && refreshSlots()}
      >
        <TabsList className="mx-3 mt-[15px] grid w-auto grid-cols-2">
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>

        <TabsContent value="drafts" className="flex flex-1 flex-col overflow-hidden">
          <div className="flex h-[28px] shrink-0 items-center px-4">
            <Button variant="ghost" size="sm" className="h-7 text-xs font-medium" onClick={handleNewDraft}>
              + New Draft
            </Button>
          </div>
          <ScrollArea className="flex-1 min-h-0 px-2 py-2">
            <div className="flex flex-col gap-2">
              {drafts.map((draft) => (
                <DraftItem
                  key={draft.id}
                  draft={draft}
                  isActive={activeDraftId === draft.id}
                  isEditing={editingDraftId === draft.id}
                  onTitleSave={handleTitleSave}
                  onStartEditing={setEditingDraftId}
                  onDelete={async (id) => {
                    try {
                      await deleteConversation(id);
                      setDrafts((prev) => prev.filter((d) => d.id !== id));
                      toast.success("Draft deleted");
                    } catch {
                      toast.error("Failed to delete draft");
                    }
                  }}
                  onContentTypeChange={async (id, contentType) => {
                    try {
                      await updateConversation(id, { contentType });
                      setDrafts((prev) =>
                        prev.map((d) => (d.id === id ? { ...d, contentType } : d))
                      );
                      window.dispatchEvent(new Event("drafts-updated"));
                      toast.success("Type updated");
                    } catch {
                      toast.error("Failed to update type");
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
