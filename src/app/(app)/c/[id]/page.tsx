import { redirect } from "next/navigation";
import { ChatArea } from "@/components/chat-area";
import { NotesSidebarContainer } from "@/components/notes-sidebar-container";
import { ConversationProvider } from "@/contexts/conversation-context";
import { getConversation } from "@/app/actions/conversations";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}

export default async function ConversationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { msg } = await searchParams;
  const initialMessage = msg ? decodeURIComponent(msg) : undefined;

  let data = await getConversation(id);
  if (!data) {
    redirect("/");
  }

  return (
    <ConversationProvider
      conversationId={id}
      initialMessage={initialMessage}
      initialData={{
        messages: data.messages,
        notes: data.notes,
        contentType: data.contentType,
        title: data.title,
      }}
    >
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatArea />
        </div>
        <NotesSidebarContainer />
      </div>
    </ConversationProvider>
  );
}
