"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TodoCard from "./TodoCard";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  remindAt: Date | string;
  repeatType: "NONE" | "DAILY" | "WEEKLY";
  isCompleted: boolean;
  aiMessage?: string | null;
}

interface DashboardTodosProps {
  todos: Todo[];
}

export default function DashboardTodos({ todos: initialTodos }: DashboardTodosProps) {
  const router = useRouter();
  const [todos, setTodos] = useState(initialTodos);

  const handleUpdate = () => {
    router.refresh();
  };

  // Group todos by status
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const getRemindAtDate = (todo: Todo): Date => {
    return typeof todo.remindAt === "string" ? new Date(todo.remindAt) : todo.remindAt;
  };

  const todayTodos = todos.filter((todo) => {
    if (todo.isCompleted) return false;
    const remindAt = getRemindAtDate(todo);
    return remindAt >= today && remindAt < tomorrow;
  });

  const overdueTodos = todos.filter((todo) => {
    if (todo.isCompleted) return false;
    const remindAt = getRemindAtDate(todo);
    return remindAt < today;
  });

  const upcomingTodos = todos.filter((todo) => {
    if (todo.isCompleted) return false;
    const remindAt = getRemindAtDate(todo);
    return remindAt >= tomorrow;
  });

  const completedTodos = todos.filter((todo) => todo.isCompleted);

  // Convert Date objects to ISO strings for TodoCard
  const formatTodoForCard = (todo: Todo) => ({
    ...todo,
    remindAt: typeof todo.remindAt === "string" ? todo.remindAt : todo.remindAt.toISOString(),
  });

  return (
    <div className="space-y-8">
      {/* Today */}
      {todayTodos.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-black dark:text-[#e9edef]">
            Today
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {todayTodos.map((todo) => (
              <TodoCard key={todo.id} todo={formatTodoForCard(todo)} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Overdue */}
      {overdueTodos.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-red-600 dark:text-red-400">
            Overdue
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overdueTodos.map((todo) => (
              <TodoCard key={todo.id} todo={formatTodoForCard(todo)} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingTodos.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-black dark:text-[#e9edef]">
            Upcoming
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingTodos.map((todo) => (
              <TodoCard key={todo.id} todo={formatTodoForCard(todo)} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedTodos.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-zinc-500 dark:text-[#8696a0]">
            Completed
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedTodos.map((todo) => (
              <TodoCard key={todo.id} todo={formatTodoForCard(todo)} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {todos.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-[#202c33]">
          <p className="text-zinc-500 dark:text-[#8696a0]">
            No tasks yet. Create your first task to get started!
          </p>
        </div>
      )}
    </div>
  );
}

