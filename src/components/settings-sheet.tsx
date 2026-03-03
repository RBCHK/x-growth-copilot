"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getVoiceBankEntries, addVoiceBankEntry, removeVoiceBankEntry } from "@/app/actions/voice-bank";
import {
  getScheduleConfig,
  saveScheduleConfig,
  type DayKey,
  type SlotRow,
  type ScheduleConfig,
} from "@/app/actions/schedule";
import { SUPPORTED_LANGUAGES, type SupportedLanguage, type LanguageSettings } from "@/lib/types";

interface VoiceBankEntry {
  id: string;
  content: string;
  type: "Reply" | "Post";
}

function VoiceBankTab() {
  const [entries, setEntries] = useState<VoiceBankEntry[]>([]);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<"Reply" | "Post">("Reply");
  const [activeTab, setActiveTab] = useState<"Reply" | "Post">("Reply");

  useEffect(() => {
    getVoiceBankEntries().then(setEntries).catch(() => setEntries([]));
  }, []);

  async function handleAdd() {
    if (!newContent.trim()) return;
    try {
      await addVoiceBankEntry(newContent.trim(), newType === "Reply" ? "REPLY" : "POST");
      const list = await getVoiceBankEntries();
      setEntries(list);
      setNewContent("");
      toast.success("Added to Voice Bank");
    } catch {
      toast.error("Failed to add");
    }
  }

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await removeVoiceBankEntry(id);
    } catch {
      toast.error("Failed to delete");
      getVoiceBankEntries().then(setEntries);
    }
  }

  const filtered = entries.filter((e) => e.type === activeTab);

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Paste an example of your writing…"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={3}
          className="text-sm"
        />
        <div className="flex items-center gap-2">
          <Select
            value={newType}
            onValueChange={(v) => setNewType(v as "Reply" | "Post")}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Reply">Reply</SelectItem>
              <SelectItem value="Post">Post</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="gap-2"
            onClick={handleAdd}
            disabled={!newContent.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      <Separator />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "Reply" | "Post")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="Reply">
            Replies ({entries.filter((e) => e.type === "Reply").length})
          </TabsTrigger>
          <TabsTrigger value="Post">
            Posts ({entries.filter((e) => e.type === "Post").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-2 pr-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No {activeTab.toLowerCase()} examples yet
            </p>
          ) : (
            filtered.map((entry) => (
              <div
                key={entry.id}
                className="group relative rounded-lg border border-border bg-muted/40 px-3 py-2.5 transition-colors duration-150"
              >
                <p className="pr-8 text-sm leading-relaxed">{entry.content}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleDelete(entry.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const DAYS: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function emptyDays(): Record<DayKey, boolean> {
  return { Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false };
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time24;
  const period = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

const DEFAULT_SCHEDULE: ScheduleConfig = {
  replies: { slots: [] },
  posts: { slots: [] },
  threads: { slots: [] },
  articles: { slots: [] },
};

interface ScheduleSectionProps {
  label: string;
  section: keyof ScheduleConfig;
  slots: SlotRow[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onTimeChange: (id: string, time: string) => void;
  onDayToggle: (id: string, day: DayKey) => void;
}

function ScheduleSection({ label, slots, onAdd, onRemove, onTimeChange, onDayToggle }: ScheduleSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[130px_repeat(7,1fr)] bg-muted/20 px-1">
          <div className="px-3 py-3 text-xs text-muted-foreground">Time</div>
          {DAYS.map((d) => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Rows */}
        {slots.map((slot) => (
          <div key={slot.id} className="grid grid-cols-[130px_repeat(7,1fr)] border-t border-border items-center px-1">
            <div className="flex items-center gap-1.5 px-3 py-3.5">
              {editingId === slot.id ? (
                <input
                  type="time"
                  autoFocus
                  value={slot.time}
                  onChange={(e) => onTimeChange(slot.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                  className="w-[80px] bg-transparent text-sm outline-none text-foreground scheme-dark"
                />
              ) : (
                <button
                  onClick={() => setEditingId(slot.id)}
                  className="text-sm text-foreground/80 hover:text-foreground transition-colors"
                >
                  {formatTime12(slot.time)}
                </button>
              )}
              <button
                onClick={() => onRemove(slot.id)}
                className="text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {DAYS.map((day) => (
              <div key={day} className="flex justify-center py-3.5">
                <button
                  role="checkbox"
                  aria-checked={slot.days[day]}
                  onClick={() => onDayToggle(slot.id, day)}
                  className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all duration-150 ${
                    slot.days[day]
                      ? "bg-blue-500 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                      : "border-border/60 bg-muted/30 hover:border-border"
                  }`}
                >
                  {slot.days[day] && (
                    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        ))}

        {/* Add row */}
        <div className="border-t border-border">
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-4 py-3 text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StrategyConfigTab() {
  const [config, setConfig] = useState<ScheduleConfig>(DEFAULT_SCHEDULE);
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getScheduleConfig().then((c) => {
      if (c) setConfig({ ...DEFAULT_SCHEDULE, ...c });
    });
  }, []);

  function scheduleSave(newConfig: ScheduleConfig) {
    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    pendingSaveRef.current = setTimeout(async () => {
      try {
        await saveScheduleConfig(newConfig);
        window.dispatchEvent(new Event("slots-updated"));
      } catch {
        toast.error("Failed to save strategy");
      }
    }, 300);
  }

  function addSlot(section: keyof ScheduleConfig) {
    const newSlot: SlotRow = { id: crypto.randomUUID(), time: "10:00", days: emptyDays() };
    setConfig((prev) => ({ ...prev, [section]: { slots: [...prev[section].slots, newSlot] } }));
  }

  function removeSlot(section: keyof ScheduleConfig, id: string) {
    const newConfig = { ...config, [section]: { slots: config[section].slots.filter((s) => s.id !== id) } };
    setConfig(newConfig);
    scheduleSave(newConfig);
  }

  function updateTime(section: keyof ScheduleConfig, id: string, time: string) {
    const newConfig = {
      ...config,
      [section]: { slots: config[section].slots.map((s) => (s.id === id ? { ...s, time } : s)) },
    };
    setConfig(newConfig);
    scheduleSave(newConfig);
  }

  function toggleDay(section: keyof ScheduleConfig, id: string, day: DayKey) {
    const newConfig = {
      ...config,
      [section]: {
        slots: config[section].slots.map((s) =>
          s.id === id ? { ...s, days: { ...s.days, [day]: !s.days[day] } } : s
        ),
      },
    };
    setConfig(newConfig);
    scheduleSave(newConfig);
  }

  const sections: { label: string; section: keyof ScheduleConfig }[] = [
    { label: "Replies", section: "replies" },
    { label: "Posts", section: "posts" },
    { label: "Threads", section: "threads" },
    { label: "Articles", section: "articles" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {sections.map(({ label, section }) => (
        <ScheduleSection
          key={section}
          label={label}
          section={section}
          slots={config[section].slots}
          onAdd={() => addSlot(section)}
          onRemove={(id) => removeSlot(section, id)}
          onTimeChange={(id, time) => updateTime(section, id, time)}
          onDayToggle={(id, day) => toggleDay(section, id, day)}
        />
      ))}
    </div>
  );
}

const MODEL_OPTIONS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
] as const;

const MODEL_STORAGE_KEY = "xreba_model";

export function getStoredModel(): string {
  if (typeof window === "undefined") return MODEL_OPTIONS[0].value;
  return localStorage.getItem(MODEL_STORAGE_KEY) ?? MODEL_OPTIONS[0].value;
}

const LANGUAGE_STORAGE_KEY = "xreba_language";

const DEFAULT_LANGUAGE_SETTINGS: LanguageSettings = {
  interfaceLanguage: "en",
  conversationLanguage: "ru",
  contentLanguage: "en",
};

export function getStoredLanguageSettings(): LanguageSettings {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE_SETTINGS;
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!raw) return DEFAULT_LANGUAGE_SETTINGS;
    return { ...DEFAULT_LANGUAGE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LANGUAGE_SETTINGS;
  }
}

function saveLanguageSettings(settings: LanguageSettings): void {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(settings));
}

function LanguageTab() {
  const [settings, setSettings] = useState<LanguageSettings>(DEFAULT_LANGUAGE_SETTINGS);

  useEffect(() => {
    setSettings(getStoredLanguageSettings());
  }, []);

  function handleChange(key: keyof LanguageSettings, value: SupportedLanguage) {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveLanguageSettings(updated);
    toast.success("Language saved");
  }

  const fields: { key: keyof LanguageSettings; label: string; desc: string }[] = [
    { key: "interfaceLanguage",    label: "Interface language",    desc: "UI labels and buttons" },
    { key: "conversationLanguage", label: "Conversation language", desc: "Language AI analyzes and chats in" },
    { key: "contentLanguage",      label: "Content language",      desc: "Language for generated posts and replies" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {fields.map(({ key, label, desc }) => (
        <div key={key} className="flex flex-col gap-2">
          <div>
            <label className="text-sm font-medium">{label}</label>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
          <Select value={settings[key]} onValueChange={(v) => handleChange(key, v as SupportedLanguage)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

function ApiKeysTab() {
  const [model, setModel] = useState<string>(MODEL_OPTIONS[0].value);

  useEffect(() => {
    setModel(getStoredModel());
  }, []);

  function handleModelChange(value: string) {
    setModel(value);
    localStorage.setItem(MODEL_STORAGE_KEY, value);
    toast.success("Model saved");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Model</label>
        <Select value={model} onValueChange={handleModelChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODEL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function AuthTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function handleChange() {
    toast.success("Password changed");
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Current password</label>
        <Input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">New password</label>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <Button
        size="sm"
        className="w-fit"
        onClick={handleChange}
        disabled={!currentPassword || !newPassword}
      >
        Change password
      </Button>
    </div>
  );
}

export function SettingsSheet({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="left" className="w-[420px] sm:max-w-[420px] overflow-hidden">
        <SheetHeader>
          <SheetTitle className="tracking-[-0.02em] font-medium">Settings</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex-1 min-h-0 flex flex-col">
          <Tabs defaultValue="voice-bank" className="flex-1 min-h-0">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="voice-bank" className="text-xs">
                Voice
              </TabsTrigger>
              <TabsTrigger value="strategy" className="text-xs">
                Strategy
              </TabsTrigger>
              <TabsTrigger value="api-keys" className="text-xs">
                API
              </TabsTrigger>
              <TabsTrigger value="language" className="text-xs">
                Language
              </TabsTrigger>
              <TabsTrigger value="auth" className="text-xs">
                Auth
              </TabsTrigger>
            </TabsList>

            <TabsContent value="voice-bank" className="mt-4 flex-1 min-h-0 flex flex-col">
              <VoiceBankTab />
            </TabsContent>
            <TabsContent value="strategy" className="mt-4 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
              <StrategyConfigTab />
            </TabsContent>
            <TabsContent value="api-keys" className="mt-4">
              <ApiKeysTab />
            </TabsContent>
            <TabsContent value="language" className="mt-4">
              <LanguageTab />
            </TabsContent>
            <TabsContent value="auth" className="mt-4">
              <AuthTab />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
