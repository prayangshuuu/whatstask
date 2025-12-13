"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CreateTodoModal from "./modals/CreateTodoModal";
import BulkPlanModal from "./modals/BulkPlanModal";
import { createTodo, createBulkTodos } from "@/app/actions/todos";

export default function DashboardHeader() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const handleSaveTodo = async (todo: {
    title: string;
    description: string;
    remindAt: string;
    repeatType: "NONE" | "DAILY" | "WEEKLY";
    timeOfDay?: string;
    repeatDays?: string[];
    aiMessage?: string;
  }) => {
    await createTodo(todo);
    router.refresh();
  };

  const handleImportTasks = async (tasks: Array<{
    title: string;
    description: string;
    remindAt: string;
    repeatType: "NONE" | "DAILY" | "WEEKLY";
    timeOfDay?: string;
    repeatDays?: string[];
    aiMessage?: string;
  }>) => {
    await createBulkTodos(tasks);
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-[#e9edef]">
            My Tasks
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-[#8696a0]">
            Manage your reminders and stay organized
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-[#008069] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00a884]"
          >
            New Task
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-purple-700 hover:to-pink-700"
          >
            🤖 AI Plan
          </button>
        </div>
      </div>

      <CreateTodoModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleSaveTodo}
      />

      <BulkPlanModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onImport={handleImportTasks}
      />
    </>
  );
}

