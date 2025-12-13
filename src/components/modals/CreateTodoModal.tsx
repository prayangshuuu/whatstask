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
      const { generateMessageForTodo } = await import("@/app/actions/ai");
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
        setSubmitting(true);
        const { generateMessageForTodo } = await import("@/app/actions/ai");
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {activeTab === "ai" ? (
            /* AI Tab */
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6 dark:border-purple-800 dark:from-purple-900/20 dark:to-pink-900/20">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
                    Describe your task
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., Remind me to call Mom every Sunday at 8pm"
                    rows={4}
                    className="w-full rounded-md border border-purple-300 bg-white px-3 py-2 text-black shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-purple-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-purple-400 dark:focus:ring-purple-400"
                  />
                </div>
                <button
                  onClick={handleAIGenerate}
                  disabled={generating || !aiPrompt.trim()}
                  className="w-full rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    "Generate"
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Manual Tab */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Text to Send Field */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="flex items-center gap-2">
                      💬 Text to Send (WhatsApp Message)
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        (will be sent to your notification number)
                      </span>
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateMessage}
                    disabled={generatingMessage || !title.trim()}
                    className="text-xs text-[#008069] hover:text-[#00a884] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {generatingMessage ? "Generating..." : "✨ Auto-generate"}
                  </button>
                </div>
                <textarea
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-black shadow-sm focus:border-[#008069] focus:outline-none focus:ring-2 focus:ring-[#008069] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-[#008069]"
                  placeholder="Enter the message to send via WhatsApp, or click 'Auto-generate' to create one automatically..."
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  If left empty, a message will be auto-generated when you save.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-[#008069] focus:outline-none focus:ring-2 focus:ring-[#008069] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-[#008069]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-[#008069] focus:outline-none focus:ring-2 focus:ring-[#008069] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-[#008069]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Repeat Type <span className="text-red-500">*</span>
                </label>
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
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-[#008069] focus:outline-none focus:ring-2 focus:ring-[#008069] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-[#008069]"
                >
                  <option value="NONE">One-time</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>

              {repeatType === "NONE" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Reminder Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={remindAt}
                    onChange={(e) => setRemindAt(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-[#008069] focus:outline-none focus:ring-2 focus:ring-[#008069] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-[#008069]"
                  />
                </div>
              )}

              {(repeatType === "DAILY" || repeatType === "WEEKLY") && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-[#008069] focus:outline-none focus:ring-2 focus:ring-[#008069] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-[#008069]"
                  />
                </div>
              )}

              {repeatType === "WEEKLY" && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Select Days <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
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
                          className="rounded border-zinc-300 text-[#008069] focus:ring-[#008069] dark:border-zinc-600 dark:bg-zinc-800"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <button
            onClick={handleClose}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          {activeTab === "manual" && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-[#008069] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00a884] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Todo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

