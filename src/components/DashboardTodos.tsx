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
  aiMessage: string | null;
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
    <div className="space-y-8 sm:space-y-10">
      {/* Today */}
      {todayTodos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            Today
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {todayTodos.map((todo) => (
              <TodoCard key={todo.id} todo={formatTodoForCard(todo)} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Overdue */}
      {overdueTodos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-destructive">
            Overdue
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {overdueTodos.map((todo) => (
              <TodoCard key={todo.id} todo={formatTodoForCard(todo)} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingTodos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            Upcoming
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {upcomingTodos.map((todo) => (
              <TodoCard key={todo.id} todo={formatTodoForCard(todo)} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedTodos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-muted-foreground">
            Completed
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {completedTodos.map((todo) => (
              <TodoCard key={todo.id} todo={formatTodoForCard(todo)} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {todos.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 sm:p-12 text-center">
          <p className="text-sm sm:text-base text-muted-foreground">
            No tasks yet. Create your first task to get started!
          </p>
        </div>
      )}
    </div>
  );
}
