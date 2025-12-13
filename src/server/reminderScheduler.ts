import { processDueReminders } from "./reminderProcessor";

/**
 * Background scheduler for processing reminders.
 * Runs every minute to check for due reminders.
 * 
 * This starts automatically when the module is imported.
 */
let schedulerInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Start the reminder scheduler
 */
export function startReminderScheduler() {
  if (isRunning) {
    console.log("[Reminder Scheduler] Already running");
    return;
  }

  console.log("[Reminder Scheduler] Starting automatic reminder processing (every 60 seconds)");

  // Process immediately on start
  processDueReminders().catch((error) => {
    console.error("[Reminder Scheduler] Error in initial processing:", error);
  });

  // Then process every 60 seconds (1 minute)
  schedulerInterval = setInterval(() => {
    processDueReminders().catch((error) => {
      console.error("[Reminder Scheduler] Error processing reminders:", error);
    });
  }, 60 * 1000); // 60 seconds

  isRunning = true;
}

/**
 * Stop the reminder scheduler
 */
export function stopReminderScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    isRunning = false;
    console.log("[Reminder Scheduler] Stopped");
  }
}

// Auto-start scheduler when module is imported (server-side only)
// Only start in production or when explicitly enabled
if (typeof window === "undefined") {
  // Check if we should auto-start (default: yes)
  const shouldAutoStart = process.env.ENABLE_REMINDER_SCHEDULER !== "false";
  
  if (shouldAutoStart) {
    // Use setImmediate to ensure it runs after module initialization
    setImmediate(() => {
      startReminderScheduler();
    });
  }
}

