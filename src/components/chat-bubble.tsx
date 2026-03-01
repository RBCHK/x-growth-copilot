import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div data-role="user" className="animate-in slide-in-from-bottom-4 fade-in duration-300 ease-out flex w-full justify-end">
        <div className="max-w-[80%] rounded-xl rounded-br-md bg-primary px-4 py-2.5 text-base leading-relaxed text-primary-foreground">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div data-role="assistant" className="w-full text-base leading-relaxed text-foreground">
      <p className="whitespace-pre-wrap">{message.content}</p>
    </div>
  );
}
