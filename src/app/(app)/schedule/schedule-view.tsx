"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/page-container";
import { SlotItem, groupSlotsByDate } from "@/components/left-sidebar";
import {
  getScheduledSlots,
  toggleSlotPosted,
  deleteSlot,
  unscheduleSlot,
} from "@/app/actions/schedule";
import type { ScheduledSlot, SlotStatus } from "@/lib/types";

export function ScheduleView() {
  const [slots, setSlots] = useState<ScheduledSlot[]>([]);

  useEffect(() => {
    getScheduledSlots()
      .then(setSlots)
      .catch(() => setSlots([]));
  }, []);

  useEffect(() => {
    const handler = () =>
      getScheduledSlots()
        .then(setSlots)
        .catch(() => {});
    window.addEventListener("slots-updated", handler);
    return () => window.removeEventListener("slots-updated", handler);
  }, []);

  function refreshSlots() {
    getScheduledSlots()
      .then(setSlots)
      .catch(() => {});
  }

  async function handleTogglePosted(id: string) {
    try {
      const result = await toggleSlotPosted(id);
      if (result.status === "EMPTY") {
        refreshSlots();
      } else {
        setSlots((prev) =>
          prev.map((s) => {
            if (s.id !== id) return s;
            const newStatus = result.status.toLowerCase() as SlotStatus;
            return { ...s, status: newStatus, postedAt: result.postedAt };
          })
        );
      }
    } catch {
      toast.error("Failed to update slot status");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSlot(id);
      setSlots((prev) => prev.filter((s) => s.id !== id));
      toast.success("Slot deleted");
    } catch {
      toast.error("Failed to delete slot");
    }
  }

  async function handleUnschedule(id: string) {
    try {
      await unscheduleSlot(id);
      refreshSlots();
      toast.success("Draft returned to drafts");
    } catch {
      toast.error("Failed to unschedule");
    }
  }

  const groupedSlots = groupSlotsByDate(slots);

  return (
    <PageContainer className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Schedule</h1>
      </div>

      {groupedSlots.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No scheduled slots for this week
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {groupedSlots.map(([dateLabel, slotList]) => (
            <div key={dateLabel} className="flex flex-col gap-2">
              <span className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {dateLabel}
              </span>
              {slotList.map((slot) => (
                <SlotItem
                  key={slot.id}
                  slot={slot}
                  onTogglePosted={handleTogglePosted}
                  onDelete={handleDelete}
                  onUnschedule={handleUnschedule}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
