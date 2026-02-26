"use client";

import { StickyNote, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useConversation } from "@/contexts/conversation-context";

export function NotesSidebar() {
  const { notes, removeNote, clearNotes } = useConversation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Notes</h2>
        {notes.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={clearNotes}
          >
            <Trash2 className="h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>

      <Separator />

      {notes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <StickyNote className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Select text in chat to add notes
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-3 py-2">
          <div className="flex flex-col gap-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group relative rounded-lg border border-border bg-muted/30 px-3 py-2.5"
              >
                <p className="pr-6 text-sm leading-relaxed">{note.content}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => removeNote(note.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
