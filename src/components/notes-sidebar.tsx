"use client";

import { StickyNote, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConversation } from "@/contexts/conversation-context";

export function NotesSidebar() {
  const { notes, removeNote, clearNotes } = useConversation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-sm font-medium tracking-[-0.02em] text-muted-foreground">Notes</h2>
        {notes.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-2 text-xs text-muted-foreground"
            onClick={clearNotes}
          >
            <Trash2 className="h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
          <StickyNote className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm leading-relaxed text-muted-foreground/80">
            Select text in chat to add notes
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="flex flex-col gap-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group relative rounded-xl border border-border bg-white/[0.03] px-4 py-3 transition-colors duration-150"
              >
                <p className="pr-6 text-sm leading-relaxed">{note.content}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
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
