import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { stopWhatsAppClientForUser } from "@/server/whatsappClientManager";

/**
 * API route to stop/cancel an ongoing WhatsApp QR generation.
 * POST /api/whatsapp/stop
 */
export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`[API] Stopping WhatsApp client for user ${user.id}`);

    // Stop the client
    const stopped = await stopWhatsAppClientForUser(user.id);

    // Update session to disconnected state
    await prisma.whatsAppSession.updateMany({
      where: { userId: user.id },
      data: {
        status: "disconnected",
        qrData: null,
        lastQrAt: null,
      },
    });

    console.log(`[API] ✅ WhatsApp client stopped for user ${user.id}, session updated to disconnected`);

    return NextResponse.json({ 
      ok: true,
      stopped 
    });
  } catch (error) {
    console.error("[API] Error stopping WhatsApp session:", error);
    return NextResponse.json(
      { error: "Failed to stop WhatsApp session" },
      { status: 500 }
    );
  }
}

