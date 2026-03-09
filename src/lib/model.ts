export const MODEL_OPTIONS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", shortLabel: "Sonnet 4.6" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", shortLabel: "Haiku 4.5" },
] as const;

export type ModelValue = (typeof MODEL_OPTIONS)[number]["value"];

export const MODEL_STORAGE_KEY = "xreba_model";

export function getStoredModel(): string {
  if (typeof window === "undefined") return MODEL_OPTIONS[0].value;
  return localStorage.getItem(MODEL_STORAGE_KEY) ?? MODEL_OPTIONS[0].value;
}

export function setStoredModel(value: string): void {
  localStorage.setItem(MODEL_STORAGE_KEY, value);
}
