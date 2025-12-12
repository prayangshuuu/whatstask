import * as dotenv from "dotenv";
import { prisma } from "../src/lib/prisma";
import { startWhatsAppClientForUser, getWhatsAppClientForUser } from "./whatsappClientManager";
import { Client } from "whatsapp-web.js";

// Load environment variables
dotenv.config();

/**
 * Build WhatsApp JID from a raw phone number string.
 * Strips non-digits and appends @c.us suffix.
 * Assumes the number already includes country code (e.g., 8801...).
 * TODO: Add more robust handling (country code validation, etc.)
 */
function buildWhatsAppJidFromNumber(raw: string): string {
  // Strip non-digits
  const digits = raw.replace(/\D/g, "");
  // Assume it already includes country code like 8801...
  // TODO: more robust handling later
  return digits + "@c.us";
}

/**
 * Send WhatsApp message using whatsapp-web.js client.
 * Returns true if message was sent successfully, false otherwise.
 */
async function sendWhatsAppMessage(
  client: Client,
  notifyNumber: string,
  message: string
): Promise<boolean> {
  try {
    const jid = buildWhatsAppJidFromNumber(notifyNumber);
    await client.sendMessage(jid, message);
    return true;
  } catch (error) {
    console.error(`[WhatsApp] Error sending message to ${notifyNumber}:`, error);
    return false;
  }
}

/**
 * Calculate the next reminder date for a weekly repeat pattern.
 * Returns the next date that matches one of the specified days.
 * Preserves the time-of-day from currentRemindAt.
 */
function getNextWeeklyReminderDate(
  currentRemindAt: Date,
  repeatDays: string
): Date {
  const days = repeatDays.split(",").map((d) => d.trim().toUpperCase());
  const dayMap: { [key: string]: number } = {
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
  };

  const now = new Date();
  const nextDate = new Date(currentRemindAt);
  
  // Preserve the time-of-day from currentRemindAt
  const hours = currentRemindAt.getHours();
  const minutes = currentRemindAt.getMinutes();
  const seconds = currentRemindAt.getSeconds();

  // Start from tomorrow
  nextDate.setDate(nextDate.getDate() + 1);
  nextDate.setHours(hours, minutes, seconds, 0);

  // Find the next matching day within the next 14 days
  for (let i = 0; i < 14; i++) {
    const dayName = Object.keys(dayMap).find(
      (key) => dayMap[key] === nextDate.getDay()
    );
    if (dayName && days.includes(dayName)) {
      return nextDate;
    }
    nextDate.setDate(nextDate.getDate() + 1);
  }

  // Fallback: if no match found, add 7 days
  const fallback = new Date(currentRemindAt);
  fallback.setDate(fallback.getDate() + 7);
  fallback.setHours(hours, minutes, seconds, 0);
  return fallback;
}

/**
 * Sync WhatsApp clients for active sessions.
 * Ensures that sessions with status "connecting", "qr_pending", or "ready" have active clients.
 */
async function syncWhatsAppClients(): Promise<void> {
  console.log("[Worker] 🔄 syncWhatsAppClients: checking sessions...");

  try {
    const sessions = await prisma.whatsAppSession.findMany({
      where: {
        status: {
          in: ["connecting", "qr_pending", "ready"],
        },
      },
      select: {
        userId: true,
        status: true,
      },
    });

    console.log(`[Worker] Found ${sessions.length} active session(s) to sync`);

    if (sessions.length === 0) {
      console.log("[Worker] No active sessions found");
      return;
    }

    for (const s of sessions) {
      console.log(`[Worker] 🚀 Starting client for user ${s.userId}, status: ${s.status}`);
      try {
        const client = await startWhatsAppClientForUser(s.userId);
        if (client) {
          console.log(`[Worker] ✅ Client started for user ${s.userId}`);
        } else {
          console.warn(`[Worker] ⚠️  startWhatsAppClientForUser returned null for user ${s.userId}`);
        }
      } catch (err) {
        console.error(`[Worker] ❌ Failed to start WhatsApp client for user ${s.userId}:`, err);
      }
    }
  } catch (err) {
    console.error("[Worker] ❌ Error in syncWhatsAppClients:", err);
  }
}

/**
 * Process all due reminders and send notifications.
 */
async function processDueReminders(): Promise<void> {
  const startTime = new Date();
  console.log(
    `[Worker] [${startTime.toISOString()}] Starting reminder processing...`
  );

  try {
    const now = new Date();

    // Fetch todos that are due for reminders
    // We fetch todos where remindAt <= now and isCompleted = false
    // Then filter in memory for those that haven't been notified yet
    const candidateTodos = await prisma.todo.findMany({
      where: {
        isCompleted: false,
        remindAt: {
          lte: now,
        },
      },
      include: {
        user: {
          include: {
            whatsappSession: true,
          },
        },
      },
    });

    // Filter: only process if lastNotifiedAt is null OR lastNotifiedAt < remindAt
    const dueTodos = candidateTodos.filter(
      (todo) =>
        !todo.lastNotifiedAt ||
        new Date(todo.lastNotifiedAt) < new Date(todo.remindAt)
    );

    console.log(
      `[Worker] [${now.toISOString()}] Found ${dueTodos.length} due reminder(s) out of ${candidateTodos.length} candidate(s)`
    );

    for (const todo of dueTodos) {
      const { user } = todo;
      const whatsappSession = user.whatsappSession;

      // Log todo details
      console.log(
        `[Worker] Processing todo: "${todo.title}" (User: ${user.email}, RemindAt: ${todo.remindAt.toISOString()}, RepeatType: ${todo.repeatType}${todo.repeatDays ? `, Days: ${todo.repeatDays}` : ""})`
      );

      // Check if user has WhatsApp session configured
      if (!whatsappSession) {
        console.warn(
          `[Worker] ⚠️  Skipping todo "${todo.title}" - User ${user.email} has no WhatsApp session configured`
        );
        continue;
      }

      // Check if WhatsApp session is ready
      if (whatsappSession.status !== "ready") {
        console.warn(
          `[Worker] ⚠️  Skipping todo "${todo.title}" - WhatsApp session status is "${whatsappSession.status}" (not ready). Phone: ${whatsappSession.phoneNumber}`
        );
        continue;
      }

      // Get the WhatsApp client for this user
      const client = getWhatsAppClientForUser(todo.userId);
      if (!client) {
        console.warn(
          `[Worker] ⚠️  No active WhatsApp client for user ${user.email}, todo "${todo.title}". Client may not be initialized yet.`
        );
        continue;
      }

      // Check if user has notification number set
      if (!user.notifyNumber || user.notifyNumber.trim() === "") {
        console.warn(
          `[Worker] ⚠️  User has no notifyNumber; not sending reminder for todo "${todo.title}" (ID: ${todo.id}). User: ${user.email}`
        );
        continue;
      }

      // Prepare reminder message
      const message = `⏰ Reminder: ${todo.title}${
        todo.description ? `\n\n${todo.description}` : ""
      }\n\nSent via WhatsTask`;

      // Log before sending
      console.log(
        `[Worker] 📤 Sending WhatsApp reminder to ${user.notifyNumber} for todo "${todo.title}" (ID: ${todo.id})`
      );

      // Send WhatsApp message
      const sendSuccess = await sendWhatsAppMessage(
        client,
        user.notifyNumber,
        message
      );

      const sentAt = new Date();

      // Create reminder log
      try {
        if (sendSuccess) {
          await prisma.reminderLog.create({
            data: {
              userId: todo.userId,
              todoId: todo.id,
              sentAt,
              status: "success",
              errorMsg: null,
            },
          });
          console.log(
            `[Worker] ✅ Successfully sent reminder for todo "${todo.title}" (ID: ${todo.id})`
          );
        } else {
          await prisma.reminderLog.create({
            data: {
              userId: todo.userId,
              todoId: todo.id,
              sentAt,
              status: "failed",
              errorMsg: "Failed to send WhatsApp message",
            },
          });
          console.error(
            `[Worker] ❌ Failed to send WhatsApp reminder for todo "${todo.title}" (ID: ${todo.id})`
          );
          // Continue to next todo without updating lastNotifiedAt
          continue;
        }
      } catch (logError) {
        console.error(
          `[Worker] Error creating reminder log for todo ${todo.id}:`,
          logError
        );
        // Continue processing even if log creation fails
        if (!sendSuccess) {
          continue;
        }
      }

      // Update lastNotifiedAt
      const updatedAt = new Date();

      // Calculate next remindAt based on repeat type
      let nextRemindAt: Date | undefined;

      switch (todo.repeatType) {
        case "NONE":
          // Leave remindAt as is (one-time reminder)
          nextRemindAt = undefined;
          break;

        case "DAILY":
          // Set remindAt to tomorrow at the same time
          nextRemindAt = new Date(todo.remindAt);
          nextRemindAt.setDate(nextRemindAt.getDate() + 1);
          break;

        case "WEEKLY":
          if (todo.repeatDays) {
            // Calculate next date matching one of the specified days
            nextRemindAt = getNextWeeklyReminderDate(
              todo.remindAt,
              todo.repeatDays
            );
          } else {
            // If no repeatDays specified, treat as same weekday next week
            nextRemindAt = new Date(todo.remindAt);
            nextRemindAt.setDate(nextRemindAt.getDate() + 7);
          }
          break;

        default:
          console.warn(
            `[Worker] ⚠️  Unknown repeat type "${todo.repeatType}" for todo "${todo.title}"`
          );
          nextRemindAt = undefined;
      }

      // Update todo with lastNotifiedAt and optionally next remindAt
      await prisma.todo.update({
        where: { id: todo.id },
        data: {
          lastNotifiedAt: updatedAt,
          ...(nextRemindAt && { remindAt: nextRemindAt }),
        },
      });

      console.log(
        `[Worker] ✅ Updated todo "${todo.title}" - lastNotifiedAt: ${updatedAt.toISOString()}${
          nextRemindAt ? `, next remindAt: ${nextRemindAt.toISOString()}` : " (one-time, no reschedule)"
        }`
      );
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(
      `[Worker] [${endTime.toISOString()}] Finished processing reminders (took ${duration}ms)`
    );
  } catch (error) {
    console.error(
      `[Worker] [${new Date().toISOString()}] Error processing reminders:`,
      error
    );
  }
}

/**
 * Start the reminder worker.
 * Runs syncWhatsAppClients() and processDueReminders() every 60 seconds.
 */
export async function startWorker(): Promise<void> {
  console.log("Reminder & WhatsApp worker starting...");

  await syncWhatsAppClients(); // initial run

  // Sync WhatsApp clients more frequently (every 10 seconds) to catch new connections quickly
  setInterval(async () => {
    await syncWhatsAppClients();
  }, 10_000);

  // Process reminders less frequently (every 60 seconds)
  // Wrap in try-catch to prevent crashes if Todo table doesn't exist
  setInterval(async () => {
    try {
      await processDueReminders();
    } catch (err) {
      console.error("[Worker] Error in reminder processing interval:", err);
      // Don't crash the worker - WhatsApp sync is more important
    }
  }, 60_000);

  console.log("Worker running: syncing WhatsApp every 10s, processing reminders every 60s");
}

// Run worker if this file is executed directly
if (require.main === module) {
  startWorker().catch((err) => {
    console.error("Worker crashed", err);
    process.exit(1);
  });
}

