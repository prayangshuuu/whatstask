import { NextRequest, NextResponse } from "next/server";
import { processDueReminders } from "@/server/reminderProcessor";
// Import scheduler to auto-start background processing
import "@/server/reminderScheduler";

/**
 * API route to process due reminders.
 * Can be called manually or by an external cron job.
 * POST /api/reminders/process
 * 
 * Optional: Add a simple auth token check via header or query param
 * For now, leaving it open for easy cron integration
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Check for auth token in header or query
    // const authToken = request.headers.get("x-cron-token") || request.nextUrl.searchParams.get("token");
    // if (authToken !== process.env.CRON_SECRET_TOKEN) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

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

