import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { startWhatsAppClientForUser } from "@/server/whatsappClientManager";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const session = await prisma.whatsAppSession.findUnique({
      where: { userId: user.id },
      select: {
        status: true,
        qrData: true,
        lastQrAt: true,
        lastConnectedAt: true,
        waNumberRaw: true,
        waDisplayName: true,
        waProfilePicUrl: true,
      },
    });

    if (!session) {
      return NextResponse.json({ status: "none" });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Get WhatsApp session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if session exists
    const existingSession = await prisma.whatsAppSession.findUnique({
      where: { userId: user.id },
    });

    let session;
    if (!existingSession) {
      // Create new session with status "connecting"
      // phoneNumber is optional and can be null for QR-only authentication
      // DO NOT set qrData, lastQrAt, wa* fields here; they will be null by default
      session = await prisma.whatsAppSession.create({
        data: {
          userId: user.id,
          phoneNumber: null,
          status: "connecting",
        },
        select: {
          status: true,
          qrData: true,
          lastQrAt: true,
          lastConnectedAt: true,
          waNumberRaw: true,
          waDisplayName: true,
          waProfilePicUrl: true,
        },
      });
    } else {
      // Update existing session - reset to connecting
      session = await prisma.whatsAppSession.update({
        where: { userId: user.id },
        data: {
          status: "connecting",
          qrData: null,
        },
        select: {
          status: true,
          qrData: true,
          lastQrAt: true,
          lastConnectedAt: true,
          waNumberRaw: true,
          waDisplayName: true,
          waProfilePicUrl: true,
        },
      });
    }

    // IMPORTANT: Start the WhatsApp client directly here (no worker needed)
    // The client will emit "qr" event asynchronously and update the DB
    console.log(`[API] Starting WhatsApp client for user ${user.id}...`);
    try {
      await startWhatsAppClientForUser(user.id);
      console.log(`[API] WhatsApp client initialization started for user ${user.id}`);
    } catch (err) {
      console.error(`[API] Failed to start WhatsApp client for user ${user.id}:`, err);
      // Don't fail the request - client might still initialize
    }

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error("Start/restart WhatsApp session error:", error);
    return NextResponse.json(
      { error: "Failed to start WhatsApp session" },
      { status: 500 }
    );
  }
}

