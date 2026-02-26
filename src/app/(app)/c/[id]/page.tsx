import { ChatArea } from "@/components/chat-area";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;

  return <ChatArea conversationId={id} />;
}
