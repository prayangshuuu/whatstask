"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDateTime } from "@/lib/formatDate";
import { generateTodoFromAI } from "@/app/actions/ai-todo";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  remindAt: string;
  repeatType: "NONE" | "DAILY" | "WEEKLY";
  repeatDays: string | null;
  isCompleted: boolean;
  lastNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type FilterType = "ALL" | "PENDING" | "COMPLETED";

export default function TodosPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [hasNotifyNumber, setHasNotifyNumber] = useState<boolean | null>(null);
  
  // AI mode state
  const [isAIMode, setIsAIMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState("");
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [remindAt, setRemindAt] = useState(""); // For NONE only
  const [timeOfDay, setTimeOfDay] = useState(""); // For DAILY/WEEKLY
  const [repeatType, setRepeatType] = useState<"NONE" | "DAILY" | "WEEKLY">("NONE");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRemindAt, setEditRemindAt] = useState(""); // For NONE only
  const [editTimeOfDay, setEditTimeOfDay] = useState(""); // For DAILY/WEEKLY
  const [editRepeatType, setEditRepeatType] = useState<"NONE" | "DAILY" | "WEEKLY">("NONE");
  const [editSelectedDays, setEditSelectedDays] = useState<string[]>([]);

  useEffect(() => {
    fetchTodos();
    checkNotifyNumber();
  }, []);

  const checkNotifyNumber = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setHasNotifyNumber(!!data.notifyNumber);
        setUserId(data.id);
      }
    } catch (err) {
      // Silently fail - this is just a hint
      console.error("Failed to check notify number:", err);
    }
  };

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/todos");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch todos");
      }
      const data = await response.json();
      setTodos(data);
    } catch (err) {
      setError("Failed to load todos. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    // Validate based on repeatType
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

    setSubmitting(true);

    try {
      // Build request body based on repeatType
      let requestBody: any = {
        title: title.trim(),
        description: description.trim() || null,
        repeatType,
      };

      if (repeatType === "NONE") {
        requestBody.remindAt = new Date(remindAt).toISOString();
      } else if (repeatType === "DAILY") {
        requestBody.timeOfDay = timeOfDay;
      } else if (repeatType === "WEEKLY") {
        requestBody.timeOfDay = timeOfDay;
        requestBody.repeatDays = selectedDays;
      }

      // Include aiMessage if present
      if (aiMessage.trim()) {
        requestBody.aiMessage = aiMessage.trim();
      }

      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        // Handle validation errors
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
          throw new Error(data.details[0].message || data.error || "Validation failed");
        }
        throw new Error(data.error || "Failed to create todo");
      }

      // Reset form
      setTitle("");
      setDescription("");
      setRemindAt("");
      setTimeOfDay("");
      setRepeatType("NONE");
      setSelectedDays([]);
      setAiMessage("");
      
      // Refresh list
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !currentStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update todo");
      }

      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this todo?")) return;

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete todo");

      await fetchTodos();
    } catch (err) {
      setError("Failed to delete todo");
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditRepeatType(todo.repeatType);
    
    const remindAtDate = new Date(todo.remindAt);
    if (todo.repeatType === "NONE") {
      setEditRemindAt(remindAtDate.toISOString().slice(0, 16));
      setEditTimeOfDay("");
    } else {
      // Extract time from remindAt for DAILY/WEEKLY
      const hours = remindAtDate.getHours().toString().padStart(2, "0");
      const minutes = remindAtDate.getMinutes().toString().padStart(2, "0");
      setEditTimeOfDay(`${hours}:${minutes}`);
      setEditRemindAt("");
    }
    
    setEditSelectedDays(todo.repeatDays ? todo.repeatDays.split(",") : []);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRemindAt("");
    setEditTimeOfDay("");
    setEditRepeatType("NONE");
    setEditSelectedDays([]);
  };

  const handleSaveEdit = async (id: string) => {
    // Validate based on repeatType
    if (editRepeatType === "NONE" && !editRemindAt) {
      setError("Reminder date and time are required for one-time reminders");
      return;
    }

    if ((editRepeatType === "DAILY" || editRepeatType === "WEEKLY") && !editTimeOfDay) {
      setError("Time is required for daily/weekly reminders");
      return;
    }

    if (editRepeatType === "WEEKLY" && editSelectedDays.length === 0) {
      setError("Please select at least one day for weekly repeats");
      return;
    }

    try {
      // Build request body based on repeatType
      let requestBody: any = {
        repeatType: editRepeatType,
      };

      if (editRepeatType === "NONE") {
        requestBody.remindAt = new Date(editRemindAt).toISOString();
      } else if (editRepeatType === "DAILY") {
        requestBody.timeOfDay = editTimeOfDay;
      } else if (editRepeatType === "WEEKLY") {
        requestBody.timeOfDay = editTimeOfDay;
        requestBody.repeatDays = editSelectedDays;
      }

      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        // Handle validation errors
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
          throw new Error(data.details[0].message || data.error || "Validation failed");
        }
        throw new Error(data.error || "Failed to update todo");
      }

      cancelEdit();
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo");
    }
  };

  const toggleDay = (day: string, isEdit: boolean) => {
    if (isEdit) {
      setEditSelectedDays((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
      );
    } else {
      setSelectedDays((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
      );
    }
  };

  // Check if reminder has already fired
  const hasAlreadyFired = (todo: Todo): boolean => {
    if (!todo.lastNotifiedAt) return false;
    const lastNotified = new Date(todo.lastNotifiedAt);
    const remindAt = new Date(todo.remindAt);
    return lastNotified >= remindAt;
  };

  const formatRepeatType = (todo: Todo) => {
    const type = todo.repeatType;
    switch (type) {
      case "NONE":
        return "One-time";
      case "DAILY": {
        const remindAtDate = new Date(todo.remindAt);
        const hours = remindAtDate.getHours().toString().padStart(2, "0");
        const minutes = remindAtDate.getMinutes().toString().padStart(2, "0");
        return `Daily at ${hours}:${minutes}`;
      }
      case "WEEKLY": {
        const remindAtDate = new Date(todo.remindAt);
        const hours = remindAtDate.getHours().toString().padStart(2, "0");
        const minutes = remindAtDate.getMinutes().toString().padStart(2, "0");
        const days = todo.repeatDays || "";
        return `Weekly on ${days} at ${hours}:${minutes}`;
      }
      default:
        return type;
    }
  };

  // Handle AI generation
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      setError("Please enter a description of what you need to do");
      return;
    }

    if (!userId) {
      setError("User ID not found. Please refresh the page.");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const result = await generateTodoFromAI(userId, aiPrompt);
      
      // Populate form fields
      setTitle(result.title);
      setDescription(result.description || "");
      setRepeatType(result.repeat);
      
      // Parse remindAt and set appropriate fields
      const remindAtDate = new Date(result.remindAt);
      if (result.repeat === "NONE") {
        setRemindAt(remindAtDate.toISOString().slice(0, 16));
        setTimeOfDay("");
      } else {
        const hours = remindAtDate.getHours().toString().padStart(2, "0");
        const minutes = remindAtDate.getMinutes().toString().padStart(2, "0");
        setTimeOfDay(`${hours}:${minutes}`);
        setRemindAt("");
        
        if (result.repeat === "WEEKLY") {
          // Parse days from remindAt if needed, or leave empty for user to select
          setSelectedDays([]);
        }
      }
      
      // Set AI message
      setAiMessage(result.aiMessage);
      
      // Switch to manual mode to show the populated form
      setIsAIMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate todo with AI");
    } finally {
      setGenerating(false);
    }
  };

  // Filter todos based on selected filter
  const filteredTodos = todos.filter((todo) => {
    if (filter === "PENDING") {
      return !todo.isCompleted;
    }
    if (filter === "COMPLETED") {
      return todo.isCompleted;
    }
    return true; // ALL
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Manage To-Dos
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create and manage your reminders
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchTodos}
              className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {hasNotifyNumber === false && (
        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
          <p>
            You haven't set a Notification Number yet.{" "}
            <Link
              href="/app/profile"
              className="font-medium underline hover:text-blue-900 dark:hover:text-blue-300"
            >
              Go to Profile
            </Link>{" "}
            to set the WhatsApp number where reminders will be sent.
          </p>
        </div>
      )}

      {/* Create Form */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
            Create New Todo
          </h3>
          {/* Tab Toggle */}
          <div className="flex gap-2 rounded-lg border border-zinc-300 bg-zinc-50 p-1 dark:border-zinc-600 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => {
                setIsAIMode(false);
                setAiPrompt("");
                setError("");
              }}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                !isAIMode
                  ? "bg-white text-black shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAIMode(true);
                setError("");
              }}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                isAIMode
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              ✨ Create with AI
            </button>
          </div>
        </div>

        {isAIMode ? (
          /* AI Mode */
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6 dark:border-purple-800 dark:from-purple-900/20 dark:to-pink-900/20">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                  AI-Powered Todo Creation
                </h4>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-purple-800 dark:text-purple-200">
                  What do you need to do?
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., 'Remind me to take meds every day at 9am' or 'Call mom next Friday at 2pm'"
                  rows={4}
                  className="mt-2 block w-full rounded-md border border-purple-300 bg-white px-3 py-2 text-black shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-purple-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-purple-400 dark:focus:ring-purple-400"
                />
                <p className="mt-2 text-xs text-purple-600 dark:text-purple-300">
                  Describe your task naturally. AI will create the todo with the right timing and details!
                </p>
              </div>
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={generating || !aiPrompt.trim()}
                className="w-full rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-purple-600 disabled:hover:to-pink-600"
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
                  "✨ Generate Todo"
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Manual Mode */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* AI Message Preview (if generated) */}
            {aiMessage && (
              <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 dark:border-purple-800 dark:from-purple-900/20 dark:to-pink-900/20">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">💬</span>
                  <label className="block text-sm font-medium text-purple-800 dark:text-purple-200">
                    WhatsApp Message Preview
                  </label>
                </div>
                <textarea
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  rows={3}
                  className="mt-2 block w-full rounded-md border border-purple-300 bg-white px-3 py-2 text-black shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-purple-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-purple-400 dark:focus:ring-purple-400"
                  placeholder="AI-generated friendly message for WhatsApp..."
                />
                <p className="mt-2 text-xs text-purple-600 dark:text-purple-300">
                  Edit the message that will be sent via WhatsApp. This is optional.
                </p>
              </div>
            )}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
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
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
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
                // Clear fields when switching types
                if (e.target.value === "NONE") {
                  setTimeOfDay("");
                } else {
                  setRemindAt("");
                }
              }}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
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
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
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
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                The system will automatically calculate the next occurrence from now.
              </p>
            </div>
          )}

          {repeatType === "WEEKLY" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Select Days <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(day)}
                      onChange={() => toggleDay(day, false)}
                      className="rounded border-zinc-300 text-black focus:ring-black dark:border-zinc-600 dark:bg-zinc-800"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {day}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-black px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {submitting ? "Creating..." : "Create Todo"}
            </button>
          </form>
        )}
      </div>

      {/* Todos List */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
              Your Todos
            </h3>
            {/* Filter Buttons */}
            <div className="flex gap-2">
              {(["ALL", "PENDING", "COMPLETED"] as FilterType[]).map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType)}
                  className={`rounded-md border px-3 py-1 text-sm font-medium transition-colors ${
                    filter === filterType
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  {filterType}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
            Loading...
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
            {todos.length === 0
              ? "No todos yet. Create your first one above!"
              : `No ${filter.toLowerCase()} todos.`}
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className={`px-6 py-4 transition-colors ${
                  todo.isCompleted
                    ? "bg-zinc-50/50 dark:bg-zinc-900/50"
                    : "bg-white dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      {/* Complete Checkbox */}
                      <button
                        onClick={() =>
                          handleToggleComplete(todo.id, todo.isCompleted)
                        }
                        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                          todo.isCompleted
                            ? "border-green-500 bg-green-500"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {todo.isCompleted && (
                          <svg
                            className="h-3 w-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-sm font-semibold ${
                            todo.isCompleted
                              ? "line-through text-zinc-500 dark:text-zinc-500"
                              : "text-black dark:text-zinc-50"
                          }`}
                        >
                          {todo.title}
                        </h4>
                        {todo.description && (
                          <p
                            className={`mt-1 text-xs ${
                              todo.isCompleted
                                ? "text-zinc-400 dark:text-zinc-600"
                                : "text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            {todo.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-zinc-500 dark:text-zinc-500">
                            {formatRepeatType(todo)}
                          </span>
                          <span className="text-zinc-400 dark:text-zinc-600">•</span>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              todo.isCompleted
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                            }`}
                          >
                            {todo.isCompleted ? "Completed" : "Pending"}
                          </span>
                        </div>
                        <div className="mt-2 text-xs">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            Next run:
                          </span>{" "}
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {formatDateTime(todo.remindAt)}
                          </span>
                          {hasAlreadyFired(todo) && !todo.isCompleted && (
                            <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-500">
                              (Already fired, waiting reschedule)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {editingId === todo.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(todo.id)}
                          className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(todo)}
                          className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(todo.id)}
                          className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {/* Edit Form (shown inline when editing) */}
                {editingId === todo.id && (
                  <div className="mt-4 space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Repeat Type
                      </label>
                      <select
                        value={editRepeatType}
                        onChange={(e) => {
                          setEditRepeatType(
                            e.target.value as "NONE" | "DAILY" | "WEEKLY"
                          );
                          if (e.target.value !== "WEEKLY")
                            setEditSelectedDays([]);
                          // Clear fields when switching types
                          if (e.target.value === "NONE") {
                            setEditTimeOfDay("");
                          } else {
                            setEditRemindAt("");
                          }
                        }}
                        className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
                      >
                        <option value="NONE">One-time</option>
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                      </select>
                    </div>

                    {editRepeatType === "NONE" && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Reminder Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={editRemindAt}
                          onChange={(e) => setEditRemindAt(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
                        />
                      </div>
                    )}

                    {(editRepeatType === "DAILY" || editRepeatType === "WEEKLY") && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Time
                        </label>
                        <input
                          type="time"
                          value={editTimeOfDay}
                          onChange={(e) => setEditTimeOfDay(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
                        />
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          The system will automatically calculate the next occurrence from now.
                        </p>
                      </div>
                    )}

                    {editRepeatType === "WEEKLY" && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Select Days
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS.map((day) => (
                            <label
                              key={day}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={editSelectedDays.includes(day)}
                                onChange={() => toggleDay(day, true)}
                                className="rounded border-zinc-300 text-black focus:ring-black dark:border-zinc-600 dark:bg-zinc-800"
                              />
                              <span className="text-xs text-zinc-700 dark:text-zinc-300">
                                {day}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

