"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useConversation } from "@/contexts/conversation-context";

export function HighlightsDrawer({ children }: { children: React.ReactNode }) {
  const { notes, removeNote } = useConversation();

  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle>Highlights{notes.length > 0 && ` (${notes.length})`}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 max-h-[50vh] overflow-y-auto">
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Select text in the conversation and click &quot;Highlight&quot; to save it as
                context for the AI.
              </p>
            ) : (
              <ul className="space-y-2">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="group flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2"
                  >
                    <p className="flex-1 text-sm leading-relaxed line-clamp-3">{note.content}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground [@media(hover:hover)]:hover:text-foreground!"
                      onClick={() => removeNote(note.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                      <span className="sr-only">Remove highlight</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
