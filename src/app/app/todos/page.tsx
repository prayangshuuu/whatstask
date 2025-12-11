"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  remindAt: string;
  repeatType: "NONE" | "DAILY" | "WEEKLY";
  repeatDays: string | null;
  isCompleted: boolean;
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
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [repeatType, setRepeatType] = useState<"NONE" | "DAILY" | "WEEKLY">("NONE");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRemindAt, setEditRemindAt] = useState("");
  const [editRepeatType, setEditRepeatType] = useState<"NONE" | "DAILY" | "WEEKLY">("NONE");
  const [editSelectedDays, setEditSelectedDays] = useState<string[]>([]);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
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
      setError("Failed to load todos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!title.trim() || !remindAt) {
      setError("Title and reminder time are required");
      return;
    }

    if (repeatType === "WEEKLY" && selectedDays.length === 0) {
      setError("Please select at least one day for weekly repeats");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          remindAt: new Date(remindAt).toISOString(),
          repeatType,
          repeatDays: repeatType === "WEEKLY" ? selectedDays.join(",") : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create todo");
      }

      // Reset form
      setTitle("");
      setDescription("");
      setRemindAt("");
      setRepeatType("NONE");
      setSelectedDays([]);
      
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

      if (!response.ok) throw new Error("Failed to update todo");

      await fetchTodos();
    } catch (err) {
      setError("Failed to update todo");
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
    setEditRemindAt(new Date(todo.remindAt).toISOString().slice(0, 16));
    setEditRepeatType(todo.repeatType);
    setEditSelectedDays(todo.repeatDays ? todo.repeatDays.split(",") : []);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRemindAt("");
    setEditRepeatType("NONE");
    setEditSelectedDays([]);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editRemindAt) {
      setError("Reminder time is required");
      return;
    }

    if (editRepeatType === "WEEKLY" && editSelectedDays.length === 0) {
      setError("Please select at least one day for weekly repeats");
      return;
    }

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remindAt: new Date(editRemindAt).toISOString(),
          repeatType: editRepeatType,
          repeatDays: editRepeatType === "WEEKLY" ? editSelectedDays.join(",") : null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update todo");

      cancelEdit();
      await fetchTodos();
    } catch (err) {
      setError("Failed to update todo");
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRepeatType = (type: string, repeatDays: string | null) => {
    switch (type) {
      case "NONE":
        return "One-time";
      case "DAILY":
        return "Daily";
      case "WEEKLY":
        if (repeatDays) {
          return `Weekly (${repeatDays})`;
        }
        return "Weekly";
      default:
        return type;
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
          {error}
        </div>
      )}

      {/* Create Form */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
          Create New Todo
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Repeat Type
            </label>
            <select
              value={repeatType}
              onChange={(e) => {
                setRepeatType(e.target.value as "NONE" | "DAILY" | "WEEKLY");
                if (e.target.value !== "WEEKLY") setSelectedDays([]);
              }}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
            >
              <option value="NONE">One-time</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </div>

          {repeatType === "WEEKLY" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
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
                            {formatDate(todo.remindAt)}
                          </span>
                          <span className="text-zinc-400 dark:text-zinc-600">•</span>
                          <span className="text-zinc-500 dark:text-zinc-500">
                            {formatRepeatType(todo.repeatType, todo.repeatDays)}
                          </span>
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
                        Reminder Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={editRemindAt}
                        onChange={(e) => setEditRemindAt(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
                      />
                    </div>
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
                        }}
                        className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
                      >
                        <option value="NONE">One-time</option>
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                      </select>
                    </div>
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

