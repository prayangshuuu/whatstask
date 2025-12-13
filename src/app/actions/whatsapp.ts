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
            try {
              const state = await reconnectedClient.getState();
              // If connected, we're good to go
              if (state === "CONNECTED") {
                client = reconnectedClient;
                break;
              }
            } catch (stateErr) {
              // State check might fail if client is still initializing
            }
            
            // Also check if client has info (means it's connected)
            if (reconnectedClient.info && reconnectedClient.info.wid) {
              client = reconnectedClient;
              break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
          }
          
          // Final check - if client has info, use it even if state check failed
          if (!client && reconnectedClient.info && reconnectedClient.info.wid) {
            try {
              const finalState = await reconnectedClient.getState();
              if (finalState === "CONNECTED" || finalState === "OPENING") {
                client = reconnectedClient;
              }
            } catch {
              // If we have info, assume it's working
              client = reconnectedClient;
            }
          }
        }
      } catch (reconnectErr) {
        console.error(`[Send Now] Failed to reconnect client:`, reconnectErr);
      }
    }
    
    // If we have a client, verify it's actually working by checking state
    if (client) {
      try {
        const state = await client.getState();
        // Accept CONNECTED or OPENING states (OPENING means it's connecting but might work)
        if (state === "CONNECTED") {
          // Perfect, client is connected
          console.log(`[Send Now] Client is CONNECTED, proceeding to send`);
        } else if (state === "OPENING" && client.info && client.info.wid) {
          // Client is opening but has info, might work - give it a try
          console.log(`[Send Now] Client is OPENING but has info, attempting to use it`);
        } else {
          console.log(`[Send Now] Client state is ${state}, not usable`);
          client = null;
        }
      } catch (stateErr) {
        // If state check fails but client has info, assume it's working
        if (client.info && client.info.wid) {
          console.log(`[Send Now] State check failed but client has info, proceeding`);
        } else {
          console.error(`[Send Now] Error checking client state:`, stateErr);
          client = null;
        }
      }
    }
    
    // If still no working client, throw error
    if (!client) {
      throw new Error("WhatsApp client is not available. Please go to the WhatsApp page and make sure it's connected, then try again.");
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

