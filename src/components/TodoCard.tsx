"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/formatDate";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  remindAt: string;
  repeatType: "NONE" | "DAILY" | "WEEKLY";
  isCompleted: boolean;
  aiMessage: string | null;
}

interface TodoCardProps {
  todo: Todo;
  onUpdate: () => void;
}

export default function TodoCard({ todo, onUpdate }: TodoCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAITooltip, setShowAITooltip] = useState(false);

  const handleToggleComplete = async () => {
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !todo.isCompleted }),
      });

      if (!response.ok) {
        throw new Error("Failed to update todo");
      }

      onUpdate();
    } catch (error) {
      console.error("Error toggling todo:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this todo?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete todo");
      }

      onUpdate();
    } catch (error) {
      console.error("Error deleting todo:", error);
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    router.push(`/app/todos`);
  };

  const formatRepeatType = () => {
    switch (todo.repeatType) {
      case "NONE":
        return "One-time";
      case "DAILY":
        return "Daily";
      case "WEEKLY":
        return "Weekly";
      default:
        return todo.repeatType;
    }
  };

  return (
    <div
      className={`group relative rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-zinc-700 dark:bg-[#202c33] ${
        todo.isCompleted ? "opacity-60" : ""
      } ${isDeleting ? "opacity-30 pointer-events-none" : ""}`}
    >
      {/* Checkbox */}
      <div className="mb-3 flex items-start gap-3">
        <button
          onClick={handleToggleComplete}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
            todo.isCompleted
              ? "border-[#008069] bg-[#008069]"
              : "border-zinc-300 dark:border-zinc-600 hover:border-[#008069]"
          }`}
        >
          {todo.isCompleted && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <h3
            className={`font-semibold text-black dark:text-[#e9edef] ${
              todo.isCompleted ? "line-through" : ""
            }`}
          >
            {todo.title}
          </h3>
          {todo.description && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-[#8696a0]">
              {todo.description}
            </p>
          )}
        </div>
      </div>

      {/* Meta Info */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500 dark:text-[#8696a0]">
          {formatDateTime(todo.remindAt)}
        </span>
        <span className="text-zinc-400 dark:text-[#667781]">•</span>
        <span className="text-zinc-500 dark:text-[#8696a0]">
          {formatRepeatType()}
        </span>
        {todo.aiMessage && (
          <>
            <span className="text-zinc-400 dark:text-[#667781]">•</span>
            <div className="relative">
              <button
                onMouseEnter={() => setShowAITooltip(true)}
                onMouseLeave={() => setShowAITooltip(false)}
                className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              >
                ✨ AI Reminder
              </button>
              {showAITooltip && (
                <div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-zinc-200 bg-white p-3 text-xs shadow-lg dark:border-zinc-700 dark:bg-[#202c33] z-10">
                  <div className="mb-1 font-semibold text-black dark:text-[#e9edef]">
                    AI-Generated Message:
                  </div>
                  <div className="text-zinc-600 dark:text-[#8696a0]">
                    {todo.aiMessage}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleEdit}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

