"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CreateTodoModal from "./modals/CreateTodoModal";
import BulkAIModal from "./modals/BulkAIModal";
import { createTodo, createBulkTodos } from "@/app/actions/todos";

interface WhatsAppSession {
  status: string;
  waNumberRaw: string | null;
  waDisplayName: string | null;
  waProfilePicUrl: string | null;
}

interface DashboardHeaderProps {
  whatsappSession: WhatsAppSession | null;
}

export default function DashboardHeader({ whatsappSession }: DashboardHeaderProps) {
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

  const handleBulkSave = async (tasks: any[]) => {
    await createBulkTodos(tasks);
    router.refresh();
  };

  const isConnected = whatsappSession?.status === "ready";
  const displayName = whatsappSession?.waDisplayName || "WhatsApp";
  const phoneNumber = whatsappSession?.waNumberRaw || "Not connected";
  const profilePic = whatsappSession?.waProfilePicUrl;

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-black dark:text-[#e9edef]">
            My Tasks
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-[#8696a0]">
            Manage your reminders and stay organized
          </p>
        </div>
        
        {/* WhatsApp Status */}
        <div className="mx-6 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2 dark:border-zinc-700 dark:bg-[#202c33]">
          {isConnected ? (
            <>
              {profilePic ? (
                <img
                  src={profilePic}
                  alt={displayName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#008069] text-white">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-black dark:text-[#e9edef]">
                    {displayName}
                  </span>
                  <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                </div>
                <span className="text-xs text-zinc-500 dark:text-[#8696a0]">
                  {phoneNumber}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                <svg className="h-6 w-6 text-zinc-500 dark:text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-500 dark:text-[#8696a0]">
                  WhatsApp Not Connected
                </span>
                <a
                  href="/app/whatsapp"
                  className="text-xs text-[#008069] hover:underline"
                >
                  Connect now →
                </a>
              </div>
            </>
          )}
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
            🤖 Bulk AI
          </button>
        </div>
      </div>

      <CreateTodoModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleSaveTodo}
      />

      <BulkAIModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSave={handleBulkSave}
      />
    </>
  );
}
