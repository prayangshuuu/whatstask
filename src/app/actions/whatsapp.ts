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
          // Wait for the client to initialize and be ready - give it more time
          let attempts = 0;
          const maxAttempts = 40; // 20 seconds max (client might need time to reconnect)
          while (attempts < maxAttempts) {
            try {
              const state = await reconnectedClient.getState();
              // If connected, we're good to go
              if (state === "CONNECTED") {
                // Double check it has info
                if (reconnectedClient.info && reconnectedClient.info.wid) {
                  client = reconnectedClient;
                  console.log(`[Send Now] Client reconnected and ready after ${attempts * 0.5}s`);
                  break;
                }
              }
            } catch (stateErr) {
              // State check might fail if client is still initializing
            }
            
            // Also check if client has info (means it's connected)
            if (reconnectedClient.info && reconnectedClient.info.wid) {
              try {
                const state = await reconnectedClient.getState();
                if (state === "CONNECTED" || state === "OPENING") {
                  client = reconnectedClient;
                  console.log(`[Send Now] Client has info and state is ${state}, using it`);
                  break;
                }
              } catch {
                // If we have info, assume it's working
                client = reconnectedClient;
                console.log(`[Send Now] Client has info, using it despite state check failure`);
                break;
              }
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
                console.log(`[Send Now] Final check: client has info and state is ${finalState}`);
              }
            } catch {
              // If we have info, assume it's working
              client = reconnectedClient;
              console.log(`[Send Now] Final check: using client with info despite state error`);
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
        } else if (state === "OPENING" && client && client.info && client.info.wid) {
          // Client is opening but has info, might work - give it a try
          console.log(`[Send Now] Client is OPENING but has info, attempting to use it`);
        } else if (state === null && client && client.info && client.info.wid) {
          // State is null but client has info - this can happen during initialization
          // If client has info, it's likely working, so try to use it
          console.log(`[Send Now] Client state is null but has info, attempting to use it`);
        } else {
          console.log(`[Send Now] Client state is ${state}, checking if we can still use it`);
          // Even if state check fails, if client has info, try to use it
          if (client && client.info && client.info.wid) {
            console.log(`[Send Now] Client has info despite state ${state}, proceeding anyway`);
          } else {
            console.log(`[Send Now] Client state is ${state} and no info, not usable`);
            client = null;
          }
        }
      } catch (stateErr) {
        // If state check fails but client has info, assume it's working
        if (client && client.info && client.info.wid) {
          console.log(`[Send Now] State check failed but client has info, proceeding`);
        } else {
          console.error(`[Send Now] Error checking client state:`, stateErr);
          // Don't set client to null if we can't check state - let it try to send
          if (!client || !client.info) {
            client = null;
          }
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

