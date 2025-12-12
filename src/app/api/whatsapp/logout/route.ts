import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { stopWhatsAppClientForUser } from "@/server/whatsappClientManager";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`[API] Logging out WhatsApp for user ${user.id}`);

    // Stop the client if it exists
    await stopWhatsAppClientForUser(user.id);

    // Update WhatsAppSession to disconnected status if it exists
    await prisma.whatsAppSession.updateMany({
      where: { userId: user.id },
      data: {
        status: "disconnected",
        qrData: null,
        // Keep profile info as last-known (waNumberRaw, waDisplayName, waProfilePicUrl)
      },
    });

    console.log(`[API] ✅ WhatsApp logged out for user ${user.id}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

