export interface Mode {
  id: string;
  name: string;
  description: string;
  algoGoal: string;
  tone: string;
}

export const MODES: Record<string, Mode> = {
  A: {
    id: "A",
    name: "Skeptic",
    description:
      "Challenge the premise of the original post with a well-reasoned counter-angle. Don't dismiss — question the assumption.",
    algoGoal: "Author engagement: provoke the author to respond and defend their stance.",
    tone: "Direct, confident, not aggressive. One sharp observation.",
    // TODO: add 1-2 real examples of your best skeptic replies
  },
  B: {
    id: "B",
    name: "Solidarity",
    description:
      "Agree but add a layer the original author missed. Amplify and extend their point.",
    algoGoal: "Author repost: the author shares your reply as validation.",
    tone: "Warm but substantive. Not sycophantic — bring real value.",
    // TODO: add 1-2 real examples of your best solidarity replies
  },
  C: {
    id: "C",
    name: "Nuance",
    description:
      "The post oversimplifies. Show the full picture — conditions, exceptions, context that changes the answer.",
    algoGoal: "Reader engagement: others reply to debate the nuance.",
    tone: "Thoughtful, measured. 'It depends on...' framing.",
    // TODO: add 1-2 real examples of your best nuance replies
  },
  D: {
    id: "D",
    name: "Insider",
    description:
      "You have direct experience or data that most commenters don't. Share the specific inside knowledge.",
    algoGoal: "Profile clicks: your reply signals authority, people visit your profile.",
    tone: "Specific and concrete. Numbers, names, or firsthand experience.",
    // TODO: add 1-2 real examples of your best insider replies
  },
  E: {
    id: "E",
    name: "Universal",
    description:
      "Extract the universal principle behind the specific post. Make it relatable to a broader audience.",
    algoGoal: "Impressions from reader base: reply resonates beyond the original thread.",
    tone: "Concise, quotable. Works standalone without reading the original post.",
    // TODO: add 1-2 real examples of your best universal replies
  },
};

export function formatModesForPrompt(): string {
  return Object.values(MODES)
    .map(
      (m) =>
        `MODE ${m.id} – ${m.name}: ${m.description}\n  Algo goal: ${m.algoGoal}\n  Tone: ${m.tone}`
    )
    .join("\n\n");
}
