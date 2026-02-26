"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { StickyNote, FilePlus, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useConversation } from "@/contexts/conversation-context";
import { MOCK_SLOTS } from "@/lib/mock-data";

interface Position {
  x: number;
  y: number;
}

export function TextSelectionPopup() {
  const [position, setPosition] = useState<Position | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addNote } = useConversation();

  const hidePopup = useCallback(() => {
    setPosition(null);
    setSelectedText("");
  }, []);

  useEffect(() => {
    function handleMouseUp(e: MouseEvent) {
      // Small delay to let the browser finalize the selection
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (!text || text.length < 3) {
          return;
        }

        // Only trigger within the chat messages area
        const chatArea = document.querySelector("[data-chat-messages]");
        if (!chatArea) return;

        const anchorNode = selection?.anchorNode;
        if (!anchorNode || !chatArea.contains(anchorNode)) return;

        const range = selection!.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelectedText(text);
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
        });
      }, 10);
    }

    function handleMouseDown(e: MouseEvent) {
      if (popupRef.current?.contains(e.target as Node)) return;
      hidePopup();
    }

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [hidePopup]);

  function handleAddToNotes() {
    addNote(selectedText);
    window.getSelection()?.removeAllRanges();
    hidePopup();
    toast.success("Added to Notes");
  }

  function handleNewDraft() {
    window.getSelection()?.removeAllRanges();
    hidePopup();
    // Sprint 2: will create a real draft in DB with the note pre-attached
    toast.success("New draft created with selected text", {
      description: "Open it from the Drafts sidebar",
    });
  }

  function handleAddToQueue() {
    const emptySlot = MOCK_SLOTS.find((s) => s.status === "empty");
    navigator.clipboard.writeText(selectedText);
    window.getSelection()?.removeAllRanges();
    hidePopup();

    if (emptySlot) {
      const date = emptySlot.date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "America/Los_Angeles",
      });
      toast.success(`Copied + scheduled for ${date}, ${emptySlot.timeSlot}`);
    } else {
      toast.error("No empty slots available");
    }
  }

  if (!position || !selectedText) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%)",
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs"
            onClick={handleAddToNotes}
          >
            <StickyNote className="h-3.5 w-3.5" />
            Notes
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add to Notes</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs"
            onClick={handleNewDraft}
          >
            <FilePlus className="h-3.5 w-3.5" />
            Draft
          </Button>
        </TooltipTrigger>
        <TooltipContent>Create new draft with this text</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs"
            onClick={handleAddToQueue}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Queue
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy + schedule in next empty slot</TooltipContent>
      </Tooltip>
    </div>
  );
}
