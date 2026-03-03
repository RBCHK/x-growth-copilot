import type { Message } from "@/lib/types";
import { useTypewriter } from "@/hooks/use-typewriter";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

interface ChatBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

const markdownComponents: Components = {
  hr: () => null,
  em: ({ children }) => (
    <em className="not-italic text-amber-400/80">{children}</em>
  ),
  h1: ({ children }) => (
    <h1 className="text-lg font-bold mt-4 mb-1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold mt-3 mb-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold mt-2 mb-0.5">{children}</h3>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-muted-foreground my-1">
      {children}
    </blockquote>
  ),
  p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
  code: ({ children }) => (
    <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
};

export function ChatBubble({ message, isStreaming = false }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const displayText = useTypewriter(message.content, !isUser && isStreaming);

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
      {isStreaming ? (
        <p className="whitespace-pre-wrap">{displayText}</p>
      ) : (
        <ReactMarkdown components={markdownComponents}>
          {message.content}
        </ReactMarkdown>
      )}
    </div>
  );
}
