"use client";

import { useState } from "react";
import { generateTodosFromAI } from "@/app/actions/ai";

interface BulkAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tasks: Array<{
    title: string;
    description: string;
    remindAt: string;
    repeatType: "NONE" | "DAILY" | "WEEKLY";
    timeOfDay?: string;
    repeatDays?: string[];
    aiMessage?: string;
  }>) => Promise<void>;
}

interface ProposedTask {
  data: {
    title: string;
    description: string;
    remindAt: string;
    repeatType: "NONE" | "DAILY" | "WEEKLY";
    aiMessage: string;
  };
  selected: boolean;
}

export default function BulkAIModal({ isOpen, onClose, onSave }: BulkAIModalProps) {
  const [bulkPrompt, setBulkPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [proposedTasks, setProposedTasks] = useState<ProposedTask[]>([]);

  const handleGenerate = async () => {
    if (!bulkPrompt.trim()) {
      setError("Please enter your plan description");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const results = await generateTodosFromAI(bulkPrompt);
      setProposedTasks(results.map((task) => ({ data: task, selected: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan with AI");
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = (index: number) => {
    setProposedTasks((prev) => {
      const updated = [...prev];
      updated[index].selected = !updated[index].selected;
      return updated;
    });
  };

  const toggleAll = () => {
    const allSelected = proposedTasks.every((pt) => pt.selected);
    setProposedTasks((prev) => prev.map((pt) => ({ ...pt, selected: !allSelected })));
  };

  const handleImport = async () => {
    const selectedTasks = proposedTasks.filter((pt) => pt.selected);

    if (selectedTasks.length === 0) {
      setError("Please select at least one task to import");
      return;
    }

    setImporting(true);
    setError("");

    try {
      const formattedTasks = selectedTasks.map((pt) => {
        const task = pt.data;
        const remindAtDate = new Date(task.remindAt);

        if (task.repeatType === "NONE") {
          return {
            title: task.title,
            description: task.description,
            remindAt: task.remindAt,
            repeatType: task.repeatType,
            aiMessage: task.aiMessage,
          };
        } else {
          const hours = remindAtDate.getHours().toString().padStart(2, "0");
          const minutes = remindAtDate.getMinutes().toString().padStart(2, "0");
          const timeOfDay = `${hours}:${minutes}`;

          if (task.repeatType === "WEEKLY") {
            const dayIndex = remindAtDate.getDay();
            const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
            return {
              title: task.title,
              description: task.description,
              remindAt: "",
              repeatType: task.repeatType,
              timeOfDay,
              repeatDays: [DAYS[dayIndex]],
              aiMessage: task.aiMessage,
            };
          } else {
            return {
              title: task.title,
              description: task.description,
              remindAt: "",
              repeatType: task.repeatType,
              timeOfDay,
              aiMessage: task.aiMessage,
            };
          }
        }
      });

      await onSave(formattedTasks);

      // Reset
      setBulkPrompt("");
      setProposedTasks([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import tasks");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setBulkPrompt("");
    setProposedTasks([]);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-[95vw] sm:w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <h2 className="text-xl font-semibold text-black dark:text-[#e9edef]">
            🤖 AI Bulk Plan
          </h2>
          <button
            onClick={handleClose}
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-black dark:text-[#8696a0] dark:hover:bg-zinc-800 dark:hover:text-[#e9edef]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {proposedTasks.length === 0 ? (
            /* Input Phase */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Describe your plan
                </label>
                <textarea
                  value={bulkPrompt}
                  onChange={(e) => setBulkPrompt(e.target.value)}
                  placeholder="Paste your brain dump here... e.g., Plan my week: Gym Mon/Wed/Fri at 7am, Call Mom Sunday at 2pm, Buy groceries tomorrow."
                  rows={8}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-purple-400 dark:focus:ring-purple-400"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating || !bulkPrompt.trim()}
                className="w-full rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating plan...
                  </span>
                ) : (
                  "✨ Generate Plan"
                )}
              </button>
            </div>
          ) : (
            /* Results Phase */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-black dark:text-[#e9edef]">
                  Proposed Tasks ({proposedTasks.filter((pt) => pt.selected).length} selected)
                </h3>
                <button
                  onClick={toggleAll}
                  className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  {proposedTasks.every((pt) => pt.selected) ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {proposedTasks.map((proposedTask, index) => {
                  const task = proposedTask.data;
                  const remindAtDate = new Date(task.remindAt);
                  return (
                    <div
                      key={index}
                      className={`rounded-lg border-2 p-4 transition-all ${
                        proposedTask.selected
                          ? "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20"
                          : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={proposedTask.selected}
                          onChange={() => toggleTask(index)}
                          className="mt-1 h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-black dark:text-[#e9edef]">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="mt-1 text-sm text-zinc-600 dark:text-[#8696a0]">
                              {task.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                              {task.repeatType === "NONE" ? "One-time" : task.repeatType === "DAILY" ? "Daily" : "Weekly"}
                            </span>
                            <span className="text-zinc-500 dark:text-[#8696a0]">
                              {remindAtDate.toLocaleString()}
                            </span>
                          </div>
                          {task.aiMessage && (
                            <div className="mt-3 rounded-md border border-purple-200 bg-white p-3 dark:border-purple-800 dark:bg-[#202c33]">
                              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-300">
                                <span>💬</span>
                                <span>WhatsApp Message</span>
                              </div>
                              <p className="text-sm text-zinc-700 dark:text-[#8696a0]">
                                {task.aiMessage}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-700">
          {proposedTasks.length > 0 && (
            <button
              onClick={() => {
                setProposedTasks([]);
                setBulkPrompt("");
              }}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Start Over
            </button>
          )}
          <button
            onClick={handleClose}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          {proposedTasks.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing || proposedTasks.filter((pt) => pt.selected).length === 0}
              className="rounded-md bg-[#008069] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00a884] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Importing...
                </span>
              ) : (
                `Import ${proposedTasks.filter((pt) => pt.selected).length} Tasks`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

