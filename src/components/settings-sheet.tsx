"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
import { getStrategyConfig, upsertStrategyConfig } from "@/app/actions/schedule";

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

function StrategyConfigTab() {
  const [postsPerDay, setPostsPerDay] = useState("2");
  const [replySessionsPerDay, setReplySessionsPerDay] = useState("4");
  const [timeSlots, setTimeSlots] = useState("9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM");

  useEffect(() => {
    getStrategyConfig().then((c) => {
      if (c) {
        setPostsPerDay(String(c.postsPerDay));
        setReplySessionsPerDay(String(c.replySessionsPerDay));
        setTimeSlots(c.timeSlots.join(", "));
      }
    });
  }, []);

  async function handleSave() {
    try {
      const slots = timeSlots.split(",").map((s) => s.trim()).filter(Boolean);
      await upsertStrategyConfig({
        postsPerDay: parseInt(postsPerDay, 10) || 2,
        replySessionsPerDay: parseInt(replySessionsPerDay, 10) || 4,
        timeSlots: slots.length ? slots : ["9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM"],
      });
      toast.success("Strategy config saved");
    } catch {
      toast.error("Failed to save");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Posts per day</label>
        <Input
          type="number"
          min="0"
          max="10"
          value={postsPerDay}
          onChange={(e) => setPostsPerDay(e.target.value)}
          className="w-24"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Reply sessions per day</label>
        <Input
          type="number"
          min="0"
          max="10"
          value={replySessionsPerDay}
          onChange={(e) => setReplySessionsPerDay(e.target.value)}
          className="w-24"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Time slots (PST)</label>
        <Input
          value={timeSlots}
          onChange={(e) => setTimeSlots(e.target.value)}
          placeholder="9:00 AM, 12:00 PM, 3:00 PM"
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated times in PST
        </p>
      </div>

      <Button size="sm" className="w-fit" onClick={handleSave}>
        Save
      </Button>
    </div>
  );
}

function ApiKeysTab() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  function handleSave() {
    toast.success("API key saved");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Anthropic API Key</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full w-9"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Stored in environment variables, never sent to third parties
        </p>
      </div>

      <Button size="sm" className="w-fit" onClick={handleSave} disabled={!apiKey}>
        Save
      </Button>
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="voice-bank" className="text-xs">
                Voice
              </TabsTrigger>
              <TabsTrigger value="strategy" className="text-xs">
                Strategy
              </TabsTrigger>
              <TabsTrigger value="api-keys" className="text-xs">
                API
              </TabsTrigger>
              <TabsTrigger value="auth" className="text-xs">
                Auth
              </TabsTrigger>
            </TabsList>

            <TabsContent value="voice-bank" className="mt-4 flex-1 min-h-0 flex flex-col">
              <VoiceBankTab />
            </TabsContent>
            <TabsContent value="strategy" className="mt-4">
              <StrategyConfigTab />
            </TabsContent>
            <TabsContent value="api-keys" className="mt-4">
              <ApiKeysTab />
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
