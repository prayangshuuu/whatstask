"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/formatDate";
import { sendTodoMessageNow } from "@/app/actions/whatsapp";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, Send, Edit2, Trash2, Sparkles, AlertCircle, Clock, Repeat } from "lucide-react";

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
  const [isSending, setIsSending] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<"ready" | "not-ready" | "checking">("checking");
  const [sendError, setSendError] = useState<string | null>(null);

  // Check WhatsApp status on mount
  useEffect(() => {
    const checkWhatsAppStatus = async () => {
      try {
        const response = await fetch("/api/whatsapp/session");
        if (response.ok) {
          const data = await response.json();
          setWhatsappStatus(data.status === "ready" ? "ready" : "not-ready");
        } else {
          setWhatsappStatus("not-ready");
        }
      } catch (error) {
        setWhatsappStatus("not-ready");
      }
    };
    checkWhatsAppStatus();
  }, []);

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

  const handleSendNow = async () => {
    if (whatsappStatus !== "ready") {
      setSendError("WhatsApp is not connected. Please connect WhatsApp first.");
      setTimeout(() => setSendError(null), 3000);
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      await sendTodoMessageNow(todo.id);
      setTimeout(() => {
        setIsSending(false);
      }, 1000);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Failed to send message");
      setIsSending(false);
      setTimeout(() => setSendError(null), 5000);
    }
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
    <Card
      className={cn(
        "group relative transition-all hover:shadow-lg border-border",
        todo.isCompleted && "opacity-60",
        isDeleting && "opacity-30 pointer-events-none"
      )}
    >
      <CardContent className="p-5">
        {/* Checkbox and Title */}
        <div className="mb-4 flex items-start gap-3">
          <button
            onClick={handleToggleComplete}
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all",
              todo.isCompleted
                ? "border-primary bg-primary"
                : "border-muted-foreground/30 hover:border-primary"
            )}
          >
            {todo.isCompleted && (
              <Check className="h-3 w-3 text-primary-foreground" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-semibold text-foreground text-base",
                todo.isCompleted && "line-through"
              )}
            >
              {todo.title}
            </h3>
            {todo.description && (
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {todo.description}
              </p>
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDateTime(todo.remindAt)}</span>
          </div>
          <span className="text-muted-foreground/50">•</span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Repeat className="h-3.5 w-3.5" />
            <span>{formatRepeatType()}</span>
          </div>
          {todo.aiMessage && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <div className="relative">
                <Badge
                  variant="secondary"
                  className="cursor-help bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
                  onMouseEnter={() => setShowAITooltip(true)}
                  onMouseLeave={() => setShowAITooltip(false)}
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  AI Reminder
                </Badge>
                {showAITooltip && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 rounded-lg border border-border bg-card p-3 text-xs shadow-lg z-10">
                    <div className="mb-1 font-semibold text-foreground">
                      WhatsApp Message (will be sent to notification number):
                    </div>
                    <div className="text-muted-foreground leading-relaxed">
                      {todo.aiMessage}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Error Message */}
        {sendError && (
          <div className="mb-3 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive border border-destructive/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{sendError}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            onClick={handleSendNow}
            disabled={isSending || whatsappStatus !== "ready"}
            size="sm"
            className="h-8 text-xs"
            title={whatsappStatus !== "ready" ? "WhatsApp not connected" : "Send message now"}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {isSending ? "Sending..." : "Send Now"}
          </Button>
          <Button
            onClick={handleEdit}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
          >
            <Edit2 className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="destructive"
            size="sm"
            className="h-8 text-xs"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
