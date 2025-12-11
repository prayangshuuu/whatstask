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

export default function TodosPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
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

  const formatRepeatType = (type: string) => {
    switch (type) {
      case "NONE":
        return "One-time";
      case "DAILY":
        return "Daily";
      case "WEEKLY":
        return "Weekly";
      default:
        return type;
    }
  };

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
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
            Your Todos
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
            Loading...
          </div>
        ) : todos.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
            No todos yet. Create your first one above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Next Reminder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Repeat Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                {todos.map((todo) => (
                  <tr
                    key={todo.id}
                    className={todo.isCompleted ? "opacity-60" : ""}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-black dark:text-zinc-50">
                        {todo.title}
                      </div>
                      {todo.description && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {todo.description}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {editingId === todo.id ? (
                        <input
                          type="datetime-local"
                          value={editRemindAt}
                          onChange={(e) => setEditRemindAt(e.target.value)}
                          className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
                        />
                      ) : (
                        formatDate(todo.remindAt)
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {editingId === todo.id ? (
                        <div className="space-y-2">
                          <select
                            value={editRepeatType}
                            onChange={(e) => {
                              setEditRepeatType(
                                e.target.value as "NONE" | "DAILY" | "WEEKLY"
                              );
                              if (e.target.value !== "WEEKLY")
                                setEditSelectedDays([]);
                            }}
                            className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
                          >
                            <option value="NONE">One-time</option>
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                          </select>
                          {editRepeatType === "WEEKLY" && (
                            <div className="flex flex-wrap gap-1">
                              {DAYS.map((day) => (
                                <label
                                  key={day}
                                  className="flex items-center gap-1 cursor-pointer"
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
                          )}
                        </div>
                      ) : (
                        formatRepeatType(todo.repeatType)
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          todo.isCompleted
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                        }`}
                      >
                        {todo.isCompleted ? "Completed" : "Pending"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      {editingId === todo.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(todo.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleToggleComplete(todo.id, todo.isCompleted)
                            }
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {todo.isCompleted ? "Uncomplete" : "Complete"}
                          </button>
                          <button
                            onClick={() => startEdit(todo)}
                            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(todo.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

