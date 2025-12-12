import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Update WhatsAppSession to disconnected status
    await prisma.whatsAppSession.updateMany({
      where: { userId: user.id },
      data: {
        status: "disconnected",
        qrData: null,
        // Keep profile info as last-known (waNumberRaw, waDisplayName, waProfilePicUrl)
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WhatsApp logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

