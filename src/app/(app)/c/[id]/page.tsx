"use client";

import { use } from "react";
import { ChatArea } from "@/components/chat-area";
import { NotesSidebar } from "@/components/notes-sidebar";
import { ConversationProvider } from "@/contexts/conversation-context";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ConversationPage({ params }: Props) {
  const { id } = use(params);

  return (
    <ConversationProvider conversationId={id}>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatArea />
        </div>
        <aside className="hidden w-80 shrink-0 border-l border-white/[0.04] bg-background lg:flex lg:flex-col">
          <NotesSidebar />
        </aside>
      </div>
    </ConversationProvider>
  );
}
