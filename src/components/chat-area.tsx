"use client";

import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { TextSelectionPopup } from "@/components/text-selection-popup";
import { useConversation } from "@/contexts/conversation-context";

export function ChatArea() {
  const {
    messages,
    input,
    contentType,
    isLoading,
    error,
    setInput,
    setContentType,
    sendMessage,
  } = useConversation();

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <ChatMessages messages={messages} />
      <div className="absolute inset-x-0 bottom-0 z-10">
        {error && (
          <div className="mx-auto w-full max-w-2xl px-4 pb-2">
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error.message || "Ошибка при обращении к модели"}
            </p>
          </div>
        )}
        <ChatInput
          value={input}
          onChange={setInput}
          contentType={contentType}
          onContentTypeChange={setContentType}
          onSend={sendMessage}
          disabled={isLoading}
        />
      </div>
      <TextSelectionPopup />
    </div>
  );
}
