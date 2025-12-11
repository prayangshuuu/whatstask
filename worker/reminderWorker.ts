import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create Prisma client for worker (separate from Next.js app)
const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

/**
 * Placeholder function for sending WhatsApp messages.
 * TODO: integrate whatsapp-web.js here to send real WhatsApp messages asynchronously.
 */
async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<void> {
  // For now, just log what would be sent
  console.log(`[WhatsApp] Would send message to ${phoneNumber}: ${message}`);
  
  // Future implementation:
  // const client = getWhatsAppClient(userId);
  // await client.sendMessage(phoneNumber, message);
}

/**
 * Calculate the next reminder date for a weekly repeat pattern.
 * Returns the next date that matches one of the specified days.
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

  // Start from tomorrow
  nextDate.setDate(nextDate.getDate() + 1);

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
  return new Date(currentRemindAt.getTime() + 7 * 24 * 60 * 60 * 1000);
}

/**
 * Process all due reminders and send notifications.
 */
async function processDueReminders(): Promise<void> {
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

    console.log(`[Worker] Found ${dueTodos.length} due reminder(s)`);

    for (const todo of dueTodos) {
      const { user } = todo;
      const whatsappSession = user.whatsappSession;

      // Check if user has WhatsApp session configured
      if (!whatsappSession) {
        console.warn(
          `[Worker] Skipping todo "${todo.title}" - User ${user.email} has no WhatsApp session`
        );
        continue;
      }

      // Check if WhatsApp session is ready
      if (whatsappSession.status !== "ready") {
        console.warn(
          `[Worker] Skipping todo "${todo.title}" - WhatsApp session status is "${whatsappSession.status}" (not ready)`
        );
        continue;
      }

      // Prepare reminder message
      const message = `Reminder: ${todo.title}${
        todo.description ? `\n${todo.description}` : ""
      }`;

      // Log what would be sent (for now)
      console.log(
        `[Worker] Would send WhatsApp reminder to ${whatsappSession.phoneNumber} for todo "${todo.title}" at ${todo.remindAt.toISOString()}`
      );

      // TODO: Actually send WhatsApp message
      await sendWhatsAppMessage(whatsappSession.phoneNumber, message);

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
          // Set remindAt to tomorrow
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
            // If no repeatDays specified, treat as every 7 days
            nextRemindAt = new Date(todo.remindAt);
            nextRemindAt.setDate(nextRemindAt.getDate() + 7);
          }
          break;

        default:
          console.warn(
            `[Worker] Unknown repeat type "${todo.repeatType}" for todo "${todo.title}"`
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
        `[Worker] Updated todo "${todo.title}" - lastNotifiedAt: ${updatedAt.toISOString()}${
          nextRemindAt ? `, next remindAt: ${nextRemindAt.toISOString()}` : ""
        }`
      );
    }
  } catch (error) {
    console.error("[Worker] Error processing reminders:", error);
  }
}

/**
 * Start the reminder worker.
 * Runs processDueReminders() every 60 seconds.
 */
export function startWorker(): void {
  console.log("[Worker] Starting reminder worker...");
  console.log("[Worker] Will check for due reminders every 60 seconds");

  // Run immediately on startup
  processDueReminders();

  // Then run every 60 seconds
  setInterval(() => {
    processDueReminders();
  }, 60 * 1000);
}

// Run worker if this file is executed directly
if (require.main === module) {
  startWorker();

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n[Worker] Shutting down gracefully...");
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n[Worker] Shutting down gracefully...");
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });
}

