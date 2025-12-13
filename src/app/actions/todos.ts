"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { getWhatsAppClientForUser } from "@/server/whatsappClientManager";
import { todoCreateSchema, todoUpdateSchema } from "@/lib/validation";
import { computeDailyRemindAt, computeWeeklyRemindAt } from "@/lib/todoHelpers";
import { generateAIMessageForTodo } from "./ai";

interface CreateTodoData {
  title: string;
  description?: string;
  remindAt?: string;
  repeatType: "NONE" | "DAILY" | "WEEKLY";
  timeOfDay?: string;
  repeatDays?: string[];
  aiMessage?: string;
}

/**
 * Create a single todo
 */
export async function createTodo(data: CreateTodoData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Validate input
    let remindAtDate: Date;
    if (data.repeatType === "NONE") {
      if (!data.remindAt) {
        throw new Error("remindAt is required for one-time reminders");
      }
      remindAtDate = new Date(data.remindAt);
    } else {
      if (!data.timeOfDay) {
        throw new Error("timeOfDay is required for daily/weekly reminders");
      }
      if (data.repeatType === "WEEKLY") {
        if (!data.repeatDays || data.repeatDays.length === 0) {
          throw new Error("repeatDays is required for weekly reminders");
        }
        remindAtDate = computeWeeklyRemindAt(data.timeOfDay, data.repeatDays);
      } else {
        remindAtDate = computeDailyRemindAt(data.timeOfDay);
      }
    }

    // Generate AI message if not provided
    let aiMessage = data.aiMessage?.trim();
    if (!aiMessage) {
      try {
        aiMessage = await generateAIMessageForTodo({
          title: data.title,
          description: data.description || "",
          remindAt: remindAtDate.toISOString(),
          repeatType: data.repeatType,
        });
      } catch (error) {
        console.error("[Create Todo] Failed to generate AI message:", error);
        // Fallback to standard format if AI generation fails
        const repeatLabel =
          data.repeatType === "DAILY"
            ? " (Daily)"
            : data.repeatType === "WEEKLY"
            ? " (Weekly)"
            : "";
        aiMessage =
          "⏰ Reminder: " +
          data.title +
          repeatLabel +
          (data.description ? "\n\n" + data.description : "") +
          "\n\nSent via WhatsTask";
      }
    }

    // Create todo
    const todo = await prisma.todo.create({
      data: {
        userId: user.id,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        remindAt: remindAtDate,
        repeatType: data.repeatType,
        repeatDays: data.repeatType === "WEEKLY" ? data.repeatDays?.join(",") || null : null,
        aiMessage: aiMessage,
      } as any, // Type assertion needed due to Prisma client type mismatch
    });

    return todo;
  } catch (error) {
    console.error("[Create Todo] Error:", error);
    throw error instanceof Error ? error : new Error("Failed to create todo");
  }
}

/**
 * Create multiple todos in bulk
 */
export async function createBulkTodos(tasks: CreateTodoData[]) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const createdTodos = [];

    for (const task of tasks) {
      try {
        let remindAtDate: Date;
        if (task.repeatType === "NONE") {
          if (!task.remindAt) {
            continue; // Skip invalid tasks
          }
          remindAtDate = new Date(task.remindAt);
        } else {
          if (!task.timeOfDay) {
            continue; // Skip invalid tasks
          }
          if (task.repeatType === "WEEKLY") {
            if (!task.repeatDays || task.repeatDays.length === 0) {
              continue; // Skip invalid tasks
            }
            remindAtDate = computeWeeklyRemindAt(task.timeOfDay, task.repeatDays);
          } else {
            remindAtDate = computeDailyRemindAt(task.timeOfDay);
          }
        }

        // Generate AI message if not provided
        let aiMessage = task.aiMessage?.trim();
        if (!aiMessage) {
          try {
            aiMessage = await generateAIMessageForTodo({
              title: task.title,
              description: task.description || "",
              remindAt: remindAtDate.toISOString(),
              repeatType: task.repeatType,
            });
          } catch (error) {
            console.error("[Bulk Create] Failed to generate AI message for task:", error);
            // Fallback
            const repeatLabel =
              task.repeatType === "DAILY"
                ? " (Daily)"
                : task.repeatType === "WEEKLY"
                ? " (Weekly)"
                : "";
            aiMessage =
              "⏰ Reminder: " +
              task.title +
              repeatLabel +
              (task.description ? "\n\n" + task.description : "") +
              "\n\nSent via WhatsTask";
          }
        }

        const todo = await prisma.todo.create({
          data: {
            userId: user.id,
            title: task.title.trim(),
            description: task.description?.trim() || null,
            remindAt: remindAtDate,
            repeatType: task.repeatType,
            repeatDays: task.repeatType === "WEEKLY" ? task.repeatDays?.join(",") || null : null,
            aiMessage: aiMessage,
          } as any, // Type assertion needed due to Prisma client type mismatch
        });

        createdTodos.push(todo);
      } catch (error) {
        console.error(`[Bulk Create] Error creating task "${task.title}":`, error);
        // Continue with other tasks
      }
    }

    return createdTodos;
  } catch (error) {
    console.error("[Bulk Create] Error:", error);
    throw error instanceof Error ? error : new Error("Failed to create todos");
  }
}

/**
 * Send WhatsApp message immediately for a todo
 */
export async function sendTodoMessageNow(todoId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Fetch todo with user data
    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
      include: {
        user: {
          select: {
            id: true,
            notifyNumber: true,
          },
        },
      },
    }) as any; // Type assertion needed due to Prisma client type mismatch

    if (!todo) {
      throw new Error("Todo not found");
    }

    if (todo.userId !== user.id) {
      throw new Error("Unauthorized");
    }

    // Check if user has notification number
    if (!todo.user.notifyNumber) {
      throw new Error("Notification number is not set. Please set it in your profile.");
    }

    // Check WhatsApp session status
    const whatsappSession = await prisma.whatsAppSession.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });

    if (!whatsappSession || whatsappSession.status !== "ready") {
      throw new Error("WhatsApp is not connected. Please connect WhatsApp first.");
    }

    // Get WhatsApp client
    const client = getWhatsAppClientForUser(user.id);
    if (!client) {
      throw new Error("WhatsApp client is not available. Please reconnect WhatsApp.");
    }

    // Build message - use aiMessage if available, otherwise generate standard format
    let message: string;
    if (todo.aiMessage && todo.aiMessage.trim()) {
      message = todo.aiMessage.trim();
    } else {
      const repeatLabel =
        todo.repeatType === "DAILY"
          ? " (Daily)"
          : todo.repeatType === "WEEKLY"
          ? " (Weekly)"
          : "";
      message =
        "⏰ Reminder: " +
        todo.title +
        repeatLabel +
        (todo.description ? "\n\n" + todo.description : "") +
        "\n\nSent via WhatsTask";
    }

    // Send message
    const jid = todo.user.notifyNumber.replace(/\D/g, "") + "@c.us";
    await client.sendMessage(jid, message);

    // Log the send
    await prisma.reminderLog.create({
      data: {
        userId: user.id,
        todoId: todo.id,
        sentAt: new Date(),
        status: "success",
      },
    });

    return { success: true, message: "Message sent successfully" };
  } catch (error) {
    console.error("[Send Todo Message] Error:", error);
    throw error instanceof Error ? error : new Error("Failed to send message");
  }
}
