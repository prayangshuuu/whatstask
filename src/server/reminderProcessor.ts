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
 * Uses weekday names (SUN, MON, etc.) matching the todoHelpers logic.
 */
function getNextWeeklyReminderDate(
  currentRemindAt: Date,
  repeatDays: string
): Date {
  const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const dayMap: { [key: string]: number } = {
    SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
  };

  const days = repeatDays.split(",").map((d) => d.trim().toUpperCase());
  const [hours, minutes] = [
    currentRemindAt.getHours(),
    currentRemindAt.getMinutes(),
  ];
  const now = new Date();

  // Check next 14 days for matching weekdays
  for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
    const candidate = new Date(currentRemindAt);
    candidate.setDate(candidate.getDate() + dayOffset);
    candidate.setHours(hours, minutes, 0, 0);

    const dayName = DAYS[candidate.getDay()];

    if (days.includes(dayName) && candidate > now) {
      return candidate;
    }
  }

  // Fallback: next week, same weekday
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
  console.log(`[Reminder Processor] Starting processing at ${startTime.toISOString()}`);

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
            webhookUrl: true,
          },
        },
      },
    });

    // Filter: only process if lastNotifiedAt is null OR lastNotifiedAt < remindAt (to avoid duplicate sends)
    const dueTodos = candidateTodos.filter(
      (todo) =>
        !todo.lastNotifiedAt ||
        new Date(todo.lastNotifiedAt) < new Date(todo.remindAt)
    );

    if (dueTodos.length > 0) {
      console.log(`[Reminder Processor] Processing ${dueTodos.length} due reminder(s)`);
    }

    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const todo of dueTodos) {
      try {
        // Check if user has notification number set
        if (!todo.user.notifyNumber) {
          skippedCount++;
          continue;
        }

        // Check if WhatsApp session is ready
        const whatsappSession = await prisma.whatsAppSession.findUnique({
          where: { userId: todo.userId },
        });

        if (!whatsappSession || whatsappSession.status !== "ready") {
          skippedCount++;
          continue;
        }

        // Get WhatsApp client
        const client = getWhatsAppClientForUser(todo.userId);
        if (!client) {
          skippedCount++;
          continue;
        }

        // Build message
        const repeatLabel =
          todo.repeatType === "DAILY"
            ? " (Daily)"
            : todo.repeatType === "WEEKLY"
            ? " (Weekly)"
            : "";
        const message =
          "⏰ Reminder: " +
          todo.title +
          repeatLabel +
          (todo.description ? "\n\n" + todo.description : "") +
          "\n\nSent via WhatsTask";

        // Send message
        console.log(`[Reminder Processor] 📤 Sending reminder: "${todo.title}" to ${todo.user.notifyNumber}`);

        const sent = await sendWhatsAppMessage(
          client,
          todo.user.notifyNumber,
          message
        );

        if (sent) {
          // Update todo: mark as notified and calculate next reminder
          const updateData: {
            lastNotifiedAt: Date;
            remindAt?: Date;
          } = {
            lastNotifiedAt: now,
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

          // Send webhook if configured
          if (todo.user.webhookUrl && todo.user.webhookUrl.trim()) {
            try {
              const webhookPayload = {
                todoId: todo.id,
                title: todo.title,
                description: todo.description,
                remindAt: todo.remindAt.toISOString(),
                repeatType: todo.repeatType,
                repeatDays: todo.repeatDays,
                userEmail: todo.user.email,
                notifyNumber: todo.user.notifyNumber,
                sentAt: now.toISOString(),
              };

              const webhookResponse = await fetch(todo.user.webhookUrl.trim(), {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(webhookPayload),
                signal: AbortSignal.timeout(5000), // 5 second timeout
              });

              if (!webhookResponse.ok) {
                console.warn(`[Reminder Processor] Webhook returned ${webhookResponse.status} for todo ${todo.id}`);
              }
            } catch (webhookErr) {
              // Don't fail the reminder if webhook fails
              console.warn(`[Reminder Processor] Webhook failed for todo ${todo.id}`);
            }
          }

          sentCount++;
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
          console.error(`[Reminder Processor] Failed to send reminder for todo ${todo.id}`);
        }
      } catch (err) {
        errorCount++;
        console.error(`[Reminder Processor] Error processing todo ${todo.id}:`, err);

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
      `[Reminder Processor] Finished: Sent=${sentCount}, Skipped=${skippedCount}, Errors=${errorCount} (${duration}ms)`
    );
  } catch (error) {
    console.error(`[Reminder Processor] Error:`, error);
    throw error;
  }
}

