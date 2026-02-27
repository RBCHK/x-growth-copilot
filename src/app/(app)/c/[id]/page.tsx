import { redirect } from "next/navigation";
import { ChatArea } from "@/components/chat-area";
import { NotesSidebarContainer } from "@/components/notes-sidebar-container";
import { ConversationProvider } from "@/contexts/conversation-context";
import { createConversation, getConversation } from "@/app/actions/conversations";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;

  let data = await getConversation(id);
  if (!data) {
    const newId = await createConversation({ title: "New draft" });
    redirect(`/c/${newId}`);
  }

  return (
    <ConversationProvider
      conversationId={id}
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
