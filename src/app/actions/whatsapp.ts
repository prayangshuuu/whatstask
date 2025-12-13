"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { getWhatsAppClientForUser, startWhatsAppClientForUser } from "@/server/whatsappClientManager";

/**
 * Build WhatsApp JID from a raw phone number string.
 */
function buildWhatsAppJidFromNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits + "@c.us";
}

/**
 * Send WhatsApp message immediately for a todo (for testing/instant send)
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
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        repeatType: true,
        aiMessage: true,
        user: {
          select: {
            id: true,
            notifyNumber: true,
          },
        },
      },
    });

    if (!todo) {
      throw new Error("Todo not found");
    }

    // Verify ownership
    if (todo.userId !== user.id) {
      throw new Error("Unauthorized");
    }

    // Check if user has notification number set
    if (!todo.user.notifyNumber) {
      throw new Error("Notification number is not set. Please set it in your profile.");
    }

    // Check if WhatsApp session is ready
    const whatsappSession = await prisma.whatsAppSession.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });

    if (!whatsappSession || whatsappSession.status !== "ready") {
      throw new Error("WhatsApp is not connected. Please connect WhatsApp first.");
    }

    // Get WhatsApp client - if not in memory but session is ready, try to reconnect
    let client = getWhatsAppClientForUser(user.id);
    if (!client && whatsappSession.status === "ready") {
      // Try to start/reconnect the client (it should reconnect using existing LocalAuth session)
      console.log(`[Send Now] Client not in memory, attempting to reconnect for user ${user.id}`);
      try {
        const reconnectedClient = await startWhatsAppClientForUser(user.id);
        if (reconnectedClient) {
          // Wait a bit for the client to initialize if needed
          // Check if client is ready (has info)
          let attempts = 0;
          while (attempts < 10 && (!reconnectedClient.info || !reconnectedClient.info.wid)) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
          }
          client = reconnectedClient;
        }
      } catch (reconnectErr) {
        console.error(`[Send Now] Failed to reconnect client:`, reconnectErr);
        throw new Error("WhatsApp client is not available. Please reconnect WhatsApp from the WhatsApp page.");
      }
    }
    
    if (!client) {
      throw new Error("WhatsApp client is not available. Please reconnect WhatsApp from the WhatsApp page.");
    }

    // Build message - use AI-generated message if available, otherwise use standard format
    let message: string;
    
    if (todo.aiMessage && todo.aiMessage.trim()) {
      message = todo.aiMessage.trim();
    } else {
      // Fall back to standard format
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
    const jid = buildWhatsAppJidFromNumber(todo.user.notifyNumber);
    await client.sendMessage(jid, message);

    // Create reminder log
    await prisma.reminderLog.create({
      data: {
        userId: user.id,
        todoId: todo.id,
        sentAt: new Date(),
        status: "success",
      },
    });

    return { success: true, message: "Message sent successfully!" };
  } catch (error) {
    console.error("[Send Now] Error:", error);
    throw error instanceof Error ? error : new Error("Failed to send message");
  }
}

