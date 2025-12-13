"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CreateTodoModal from "./modals/CreateTodoModal";
import BulkAIModal from "./modals/BulkAIModal";
import { createTodo, createBulkTodos } from "@/app/actions/todos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Sparkles, Plus } from "lucide-react";

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
      <div className="space-y-6">
        {/* Title Section */}
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            My Tasks
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            Manage your reminders and stay organized
          </p>
        </div>

        {/* Actions and Status Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* WhatsApp Status */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 sm:px-4 w-full sm:w-auto">
            {isConnected ? (
              <>
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                  {profilePic ? (
                    <AvatarImage src={profilePic} alt={displayName} />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                      {displayName}
                    </span>
                    <Badge variant="default" className="h-4 sm:h-5 px-1 sm:px-1.5 text-xs shrink-0">
                      <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-white mr-0.5 sm:mr-1" />
                      Active
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {phoneNumber}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                  <AvatarFallback className="bg-muted">
                    <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                    WhatsApp Not Connected
                  </span>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto p-0 text-xs text-primary justify-start"
                  >
                    <a href="/app/whatsapp">
                      Connect now →
                    </a>
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 sm:flex-none"
              size="default"
            >
              <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
              <span className="hidden xs:inline">New Task</span>
              <span className="xs:hidden">New</span>
            </Button>
            <Button
              onClick={() => setShowBulkModal(true)}
              variant="secondary"
              className="flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              size="default"
            >
              <Sparkles className="h-4 w-4 mr-1.5 sm:mr-2" />
              <span className="hidden xs:inline">Bulk AI</span>
              <span className="xs:hidden">AI</span>
            </Button>
          </div>
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
