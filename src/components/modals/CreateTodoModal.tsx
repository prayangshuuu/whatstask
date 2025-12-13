"use client";

import { useState } from "react";
import { generateTodoFromAI } from "@/app/actions/ai";
import { generateMessageForTodo } from "@/app/actions/ai";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";

interface CreateTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: {
    title: string;
    description: string;
    remindAt: string;
    repeatType: "NONE" | "DAILY" | "WEEKLY";
    timeOfDay?: string;
    repeatDays?: string[];
    aiMessage?: string;
  }) => Promise<void>;
}

export default function CreateTodoModal({ isOpen, onClose, onSave }: CreateTodoModalProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [repeatType, setRepeatType] = useState<"NONE" | "DAILY" | "WEEKLY">("NONE");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [aiMessage, setAiMessage] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingMessage, setGeneratingMessage] = useState(false);

  const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      setError("Please enter a description of what you need to do");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const result = await generateTodoFromAI(aiPrompt);

      // Populate form fields
      setTitle(result.title);
      setDescription(result.description || "");
      setRepeatType(result.repeatType);

      const remindAtDate = new Date(result.remindAt);
      if (result.repeatType === "NONE") {
        setRemindAt(remindAtDate.toISOString().slice(0, 16));
        setTimeOfDay("");
      } else {
        const hours = remindAtDate.getHours().toString().padStart(2, "0");
        const minutes = remindAtDate.getMinutes().toString().padStart(2, "0");
        setTimeOfDay(`${hours}:${minutes}`);
        setRemindAt("");
      }

      setAiMessage(result.aiMessage);
      setActiveTab("manual"); // Switch to manual tab to show filled form
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate todo with AI");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateMessage = async () => {
    if (!title.trim()) {
      setError("Please enter a title first");
      return;
    }

    setGeneratingMessage(true);
    setError("");

    try {
      const message = await generateMessageForTodo(
        title.trim(),
        description.trim(),
        repeatType
      );
      setAiMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate message");
    } finally {
      setGeneratingMessage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (repeatType === "NONE" && !remindAt) {
      setError("Reminder date and time are required for one-time reminders");
      return;
    }

    if ((repeatType === "DAILY" || repeatType === "WEEKLY") && !timeOfDay) {
      setError("Time is required for daily/weekly reminders");
      return;
    }

    if (repeatType === "WEEKLY" && selectedDays.length === 0) {
      setError("Please select at least one day for weekly repeats");
      return;
    }

    // Auto-generate message if not provided
    let finalMessage = aiMessage.trim();
    if (!finalMessage) {
      try {
        finalMessage = await generateMessageForTodo(
          title.trim(),
          description.trim(),
          repeatType
        );
      } catch (err) {
        // If AI generation fails, use standard format
        const repeatLabel =
          repeatType === "DAILY"
            ? " (Daily)"
            : repeatType === "WEEKLY"
            ? " (Weekly)"
            : "";
        finalMessage =
          "⏰ Reminder: " +
          title.trim() +
          repeatLabel +
          (description.trim() ? "\n\n" + description.trim() : "") +
          "\n\nSent via WhatsTask";
      }
    }

    setSubmitting(true);

    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        remindAt: repeatType === "NONE" ? remindAt : "",
        repeatType,
        timeOfDay: repeatType !== "NONE" ? timeOfDay : undefined,
        repeatDays: repeatType === "WEEKLY" ? selectedDays : undefined,
        aiMessage: finalMessage,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setRemindAt("");
      setTimeOfDay("");
      setRepeatType("NONE");
      setSelectedDays([]);
      setAiMessage("");
      setAiPrompt("");
      setActiveTab("manual");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setRemindAt("");
    setTimeOfDay("");
    setRepeatType("NONE");
    setSelectedDays([]);
    setAiMessage("");
    setAiPrompt("");
    setError("");
    setActiveTab("manual");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Create New Todo</DialogTitle>
          <DialogDescription>
            Add a new task with manual input or use AI to generate it from natural language.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "ai")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="ai">✨ AI Assist</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4 mt-4">
            <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6 dark:border-purple-800 dark:from-purple-900/20 dark:to-pink-900/20">
              <div className="mb-4">
                <Label className="text-purple-800 dark:text-purple-200 mb-2">
                  Describe your task
                </Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Remind me to call Mom every Sunday at 8pm"
                  rows={4}
                  className="mt-2"
                />
              </div>
              <Button
                onClick={handleAIGenerate}
                disabled={generating || !aiPrompt.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>
                  <span className="flex items-center gap-2">
                    💬 Text to Send (WhatsApp Message)
                    <span className="text-xs text-muted-foreground font-normal">
                      (will be sent to your notification number)
                    </span>
                  </span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateMessage}
                  disabled={generatingMessage || !title.trim()}
                  className="text-xs h-auto py-1"
                >
                  {generatingMessage ? "Generating..." : "✨ Auto-generate"}
                </Button>
              </div>
              <Textarea
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                rows={3}
                placeholder="Enter the message to send via WhatsApp, or click 'Auto-generate' to create one automatically..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                If left empty, a message will be auto-generated when you save.
              </p>
            </div>

            <div>
              <Label>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label>
                Repeat Type <span className="text-destructive">*</span>
              </Label>
              <select
                value={repeatType}
                onChange={(e) => {
                  setRepeatType(e.target.value as "NONE" | "DAILY" | "WEEKLY");
                  if (e.target.value !== "WEEKLY") setSelectedDays([]);
                  if (e.target.value === "NONE") {
                    setTimeOfDay("");
                  } else {
                    setRemindAt("");
                  }
                }}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="NONE">One-time</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>

            {repeatType === "NONE" && (
              <div>
                <Label>
                  Reminder Date & Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={remindAt}
                  onChange={(e) => setRemindAt(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            )}

            {(repeatType === "DAILY" || repeatType === "WEEKLY") && (
              <div>
                <Label>
                  Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="time"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            )}

            {repeatType === "WEEKLY" && (
              <div>
                <Label className="mb-2">
                  Select Days <span className="text-destructive">*</span>
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DAYS.map((day) => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDays.includes(day)}
                        onChange={() =>
                          setSelectedDays((prev) =>
                            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
                          )
                        }
                        className="rounded border-input text-primary focus:ring-primary"
                      />
                      <span className="text-sm">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Todo"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
