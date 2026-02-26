"use client";

import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { useConversation } from "@/contexts/conversation-context";

export function ChatArea() {
  const {
    messages,
    input,
    contentType,
    setInput,
    setContentType,
    sendMessage,
  } = useConversation();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatMessages messages={messages} />
      <ChatInput
        value={input}
        onChange={setInput}
        contentType={contentType}
        onContentTypeChange={setContentType}
        onSend={sendMessage}
      />
    </div>
  );
}
