import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import type { ContentType } from "@/lib/types";
import { getVoiceBankEntries } from "@/app/actions/voice-bank";
import { getRecentUsedModes } from "@/app/actions/conversations";
import { getReplyPrompt } from "@/prompts/analyst-reply";
import { getPostPrompt } from "@/prompts/analyst-post";
import { fetchTweetFromText } from "@/lib/parse-tweet";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Auth check
  const auth = req.cookies.get("auth")?.value;
  if (auth !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    messages,
    contentType,
    notes,
    conversationId,
  }: {
    messages: UIMessage[];
    contentType: ContentType;
    notes: string[];
    conversationId?: string;
  } = body;

  // Load voice bank and recent modes in parallel
  const [voiceBankEntries, recentModes] = await Promise.all([
    getVoiceBankEntries(contentType === "Reply" ? "REPLY" : "POST", 25),
    contentType === "Reply" ? getRecentUsedModes(conversationId, 5) : Promise.resolve([]),
  ]);
  const voiceBank = voiceBankEntries.map((e) => e.content);

  // Check first user message for tweet URL, inject as extra system context
  let tweetContext = "";
  const firstUserMsg = messages.find((m) => m.role === "user");
  if (firstUserMsg) {
    const firstText = firstUserMsg.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("");
    const tweet = await fetchTweetFromText(firstText);
    if (tweet) {
      tweetContext = `\n\n## Original Post (fetched from URL)\n${tweet.text}`;
    }
  }

  // Build system prompt
  const baseSystem =
    contentType === "Reply"
      ? getReplyPrompt(notes, voiceBank, recentModes)
      : getPostPrompt(contentType as "Post" | "Thread" | "Article", notes, voiceBank);

  const systemPrompt = baseSystem + tweetContext;

  // Convert UIMessage[] to ModelMessage[] for streamText
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
