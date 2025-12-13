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
      include: {
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

    // Try to get WhatsApp client first (might be in memory)
    let client = getWhatsAppClientForUser(user.id);
    
    // If client not in memory, try to reconnect it
    if (!client) {
      console.log(`[Send Now] Client not in memory, attempting to reconnect for user ${user.id}`);
      try {
        const reconnectedClient = await startWhatsAppClientForUser(user.id);
        if (reconnectedClient) {
          // Wait for the client to initialize and be ready
          let attempts = 0;
          const maxAttempts = 20; // 10 seconds max
          while (attempts < maxAttempts) {
            // Check if client has info (means it's connected)
            if (reconnectedClient.info && reconnectedClient.info.wid) {
              client = reconnectedClient;
              break;
            }
            // Also check if client state is READY
            const state = await reconnectedClient.getState();
            if (state === "CONNECTED") {
              client = reconnectedClient;
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
          }
          
          // If still not ready after waiting, check one more time
          if (!client && reconnectedClient.info && reconnectedClient.info.wid) {
            client = reconnectedClient;
          }
        }
      } catch (reconnectErr) {
        console.error(`[Send Now] Failed to reconnect client:`, reconnectErr);
        // Don't throw yet - check if we have a session in DB
      }
    }
    
    // If we have a client, verify it's actually ready
    if (client) {
      try {
        // Check if client is actually connected by checking its state
        const state = await client.getState();
        if (state !== "CONNECTED") {
          console.log(`[Send Now] Client state is ${state}, not CONNECTED`);
          client = null;
        } else if (!client.info || !client.info.wid) {
          console.log(`[Send Now] Client exists but has no info`);
          client = null;
        }
      } catch (stateErr) {
        console.error(`[Send Now] Error checking client state:`, stateErr);
        client = null;
      }
    }
    
    // If still no client, check DB status and provide helpful error
    if (!client) {
      const whatsappSession = await prisma.whatsAppSession.findUnique({
        where: { userId: user.id },
        select: { status: true },
      });
      
      if (!whatsappSession) {
        throw new Error("WhatsApp is not connected. Please go to the WhatsApp page and connect your account.");
      } else if (whatsappSession.status !== "ready") {
        throw new Error(`WhatsApp status is "${whatsappSession.status}". Please go to the WhatsApp page and reconnect your account.`);
      } else {
        throw new Error("WhatsApp client is not available. Please try reconnecting from the WhatsApp page, or wait a moment and try again.");
      }
    }

    // Build message - use AI-generated message if available, otherwise use standard format
    let message: string;
    
    const aiMessage = (todo as any).aiMessage as string | null | undefined;
    if (aiMessage && aiMessage.trim()) {
      message = aiMessage.trim();
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

