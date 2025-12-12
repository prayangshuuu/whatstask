import { NextResponse } from "next/server";
import { processDueReminders } from "@/server/reminderProcessor";

/**
 * API route to process due reminders.
 * Can be called manually or by an external cron job.
 * POST /api/reminders/process
 */
export async function POST() {
  try {
    await processDueReminders();
    return NextResponse.json({ 
      success: true,
      message: "Reminders processed successfully"
    });
  } catch (error) {
    console.error("[API] Error processing reminders:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to process reminders",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

