import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";

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
        id: true,
        phoneNumber: true,
        status: true,
        qrData: true,
        lastQrAt: true,
        lastConnectedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!session) {
      return NextResponse.json(null);
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

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "phoneNumber is required" },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation - should start with +)
    if (!phoneNumber.startsWith("+")) {
      return NextResponse.json(
        { error: "Phone number must start with + (e.g., +1234567890)" },
        { status: 400 }
      );
    }

    // Upsert: create if doesn't exist, update if exists
    // Set status to "connecting" to trigger worker to start client
    const session = await prisma.whatsAppSession.upsert({
      where: { userId: user.id },
      update: {
        phoneNumber,
        status: "connecting",
        qrData: null, // Clear any existing QR code
      },
      create: {
        userId: user.id,
        phoneNumber,
        status: "connecting",
        qrData: null,
      },
      select: {
        id: true,
        phoneNumber: true,
        status: true,
        qrData: true,
        lastQrAt: true,
        lastConnectedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error("Create/update WhatsApp session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

