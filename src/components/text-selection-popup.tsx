"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { StickyNote, FilePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useConversation } from "@/contexts/conversation-context";
import { createConversation } from "@/app/actions/conversations";

const POPUP_HEIGHT = 48;
const SAFE_MARGIN = 12;

interface Position {
  x: number;
  y: number;
  flipBelow: boolean;
}

export function TextSelectionPopup() {
  const [position, setPosition] = useState<Position | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);
  const { addNote } = useConversation();

  const hidePopup = useCallback(() => {
    setPosition(null);
    setSelectedText("");
  }, []);

  useEffect(() => {
    function handleMouseUp() {
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
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const fitsAbove = rect.top - POPUP_HEIGHT >= SAFE_MARGIN;

        setSelectedText(text);
        setPosition({
          x: rect.left + rect.width / 2,
          y: fitsAbove ? rect.top - 8 : rect.bottom + 8,
          flipBelow: !fitsAbove,
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

  async function handleAddToNotes() {
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    const messageEl =
      anchorNode instanceof Element
        ? anchorNode.closest("[data-message-id]")
        : anchorNode?.parentElement?.closest("[data-message-id]");
    const messageId = messageEl?.getAttribute("data-message-id");
    if (!messageId) {
      toast.error("Could not determine message");
      return;
    }
    selection?.removeAllRanges();
    hidePopup();
    const ok = await addNote(selectedText, messageId);
    if (ok) {
      toast.success("Added to notes");
    } else {
      toast.error("Failed to save note");
    }
  }

  async function handleNewDraft() {
    window.getSelection()?.removeAllRanges();
    hidePopup();
    try {
      await createConversation({
        title: selectedText.slice(0, 200),
        initialContent: selectedText,
      });
      window.dispatchEvent(new Event("drafts-updated"));
      toast.success("Draft created");
    } catch {
      toast.error("Failed to create draft");
    }
  }

  if (!position || !selectedText) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 flex items-center gap-2 rounded-lg border border-border bg-popover p-2 animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: position.x,
        top: position.y,
        transform: position.flipBelow ? "translate(-50%, 0%)" : "translate(-50%, -100%)",
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 px-2.5 text-xs"
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
            className="h-8 gap-2 px-2.5 text-xs"
            onClick={handleAddToNotes}
          >
            <StickyNote className="h-3.5 w-3.5" />
            Notes
          </Button>
        </TooltipTrigger>
        <TooltipContent>Save to notes as AI context</TooltipContent>
      </Tooltip>
    </div>
  );
}
