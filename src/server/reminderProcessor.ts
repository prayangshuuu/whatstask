import { prisma } from "@/lib/prisma";
import { getWhatsAppClientForUser } from "./whatsappClientManager";
import { Client } from "whatsapp-web.js";

/**
 * Build WhatsApp JID from a raw phone number string.
 * Strips non-digits and appends @c.us suffix.
 * Assumes the number already includes country code (e.g., 8801...).
 */
function buildWhatsAppJidFromNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
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
    console.error(`[Reminder Processor] Error sending message to ${notifyNumber}:`, error);
    return false;
  }
}

/**
 * Calculate the next reminder date for a weekly repeat pattern.
 */
function getNextWeeklyReminderDate(
  currentRemindAt: Date,
  repeatDays: string
): Date {
  const days = repeatDays.split(",").map((d) => parseInt(d.trim(), 10));
  const currentDay = currentRemindAt.getDay();
  const currentTime = currentRemindAt.getHours() * 60 + currentRemindAt.getMinutes();

  // Find next day in the repeat pattern
  for (let i = 1; i <= 7; i++) {
    const checkDay = (currentDay + i) % 7;
    if (days.includes(checkDay)) {
      const nextDate = new Date(currentRemindAt);
      nextDate.setDate(nextDate.getDate() + i);
      nextDate.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);
      return nextDate;
    }
  }

  // Fallback: next week, same day
  const fallback = new Date(currentRemindAt);
  fallback.setDate(fallback.getDate() + 7);
  return fallback;
}

/**
 * Process all due reminders and send notifications.
 * This function can be called from an API route or external cron job.
 */
export async function processDueReminders(): Promise<void> {
  const startTime = new Date();
  console.log(
    `[Reminder Processor] [${startTime.toISOString()}] Starting reminder processing...`
  );

  try {
    const now = new Date();

    // Fetch todos that are due for reminders
    const candidateTodos = await prisma.todo.findMany({
      where: {
        isCompleted: false,
        remindAt: {
          lte: now,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            notifyNumber: true,
          },
        },
      },
    });

    console.log(`[Reminder Processor] Found ${candidateTodos.length} candidate todo(s)`);

    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const todo of candidateTodos) {
      try {
        // Check if user has notification number set
        if (!todo.user.notifyNumber) {
          console.warn(
            `[Reminder Processor] Skipping todo ${todo.id} - user ${todo.user.email} has no notifyNumber`
          );
          skippedCount++;
          continue;
        }

        // Check if WhatsApp session is ready
        const whatsappSession = await prisma.whatsAppSession.findUnique({
          where: { userId: todo.userId },
        });

        if (!whatsappSession || whatsappSession.status !== "ready") {
          console.warn(
            `[Reminder Processor] Skipping todo ${todo.id} - WhatsApp session not ready for user ${todo.user.email}`
          );
          skippedCount++;
          continue;
        }

        // Get WhatsApp client
        const client = getWhatsAppClientForUser(todo.userId);
        if (!client) {
          console.warn(
            `[Reminder Processor] Skipping todo ${todo.id} - no WhatsApp client found for user ${todo.user.email}`
          );
          skippedCount++;
          continue;
        }

        // Build message
        const message =
          "⏰ Reminder: " +
          todo.title +
          (todo.description ? "\n\n" + todo.description : "") +
          "\n\nSent via WhatsTask";

        // Send message
        console.log(
          `[Reminder Processor] Sending reminder to ${todo.user.notifyNumber} for todo "${todo.title}"`
        );

        const sent = await sendWhatsAppMessage(
          client,
          todo.user.notifyNumber,
          message
        );

        if (sent) {
          // Update todo: mark as notified and calculate next reminder
          const updateData: {
            lastNotifiedAt: Date;
            remindAt: Date;
          } = {
            lastNotifiedAt: now,
            remindAt: todo.remindAt, // Default: keep same
          };

          if (todo.repeatType === "DAILY") {
            // Next day, same time
            const nextRemind = new Date(todo.remindAt);
            nextRemind.setDate(nextRemind.getDate() + 1);
            updateData.remindAt = nextRemind;
          } else if (todo.repeatType === "WEEKLY" && todo.repeatDays) {
            updateData.remindAt = getNextWeeklyReminderDate(
              todo.remindAt,
              todo.repeatDays
            );
          }
          // For NONE, remindAt stays the same (won't trigger again)

          await prisma.todo.update({
            where: { id: todo.id },
            data: updateData,
          });

          // Create reminder log
          await prisma.reminderLog.create({
            data: {
              userId: todo.userId,
              todoId: todo.id,
              sentAt: now,
              status: "success",
            },
          });

          sentCount++;
          console.log(`[Reminder Processor] ✅ Successfully sent reminder for todo ${todo.id}`);
        } else {
          // Log failure
          await prisma.reminderLog.create({
            data: {
              userId: todo.userId,
              todoId: todo.id,
              sentAt: now,
              status: "failed",
              errorMsg: "Failed to send WhatsApp message",
            },
          });
          errorCount++;
          console.error(`[Reminder Processor] ❌ Failed to send reminder for todo ${todo.id}`);
        }
      } catch (err) {
        errorCount++;
        console.error(`[Reminder Processor] ❌ Error processing todo ${todo.id}:`, err);

        // Log error
        try {
          await prisma.reminderLog.create({
            data: {
              userId: todo.userId,
              todoId: todo.id,
              sentAt: now,
              status: "failed",
              errorMsg: err instanceof Error ? err.message : String(err),
            },
          });
        } catch (logErr) {
          console.error(`[Reminder Processor] Failed to create error log:`, logErr);
        }
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(
      `[Reminder Processor] [${endTime.toISOString()}] Finished processing reminders (took ${duration}ms) - Sent: ${sentCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`
    );
  } catch (error) {
    console.error(
      `[Reminder Processor] [${new Date().toISOString()}] Error processing reminders:`,
      error
    );
    throw error;
  }
}

