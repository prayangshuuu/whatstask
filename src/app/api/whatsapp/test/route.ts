import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { getWhatsAppClientForUser } from "@/server/whatsappClientManager";

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Fetch user with notifyNumber
        const userData = await prisma.user.findUnique({
            where: { id: user.id },
            select: { notifyNumber: true },
        });

        if (!userData || !userData.notifyNumber) {
            return NextResponse.json(
                { error: "Notification number is not set in your profile." },
                { status: 400 }
            );
        }

        // Fetch WhatsAppSession
        const session = await prisma.whatsAppSession.findUnique({
            where: { userId: user.id },
            select: { status: true },
        });

        if (!session || session.status !== "ready") {
            return NextResponse.json(
                { error: "WhatsApp is not connected." },
                { status: 400 }
            );
        }

        // Get client
        // Note: client should be running if status is ready.
        // If not, we might need to start it, but usually the server/worker keeps it running.
        // We'll use getWhatsAppClientForUser which might return null if not initialized in memory.
        const client = await getWhatsAppClientForUser(user.id);

        if (!client) {
            // In a real production setup with multiple instances/workers, this might be tricky if the client is on another instance.
            // But per user requirements: "It should rely only on: the in-memory WhatsApp client manager".
            return NextResponse.json(
                { error: "WhatsApp client is not active in this instance. Try reloading or reconnecting." },
                { status: 500 }
            );
        }

        const recipientNumber = userData.notifyNumber.replace(/[^0-9]/g, "");
        const jid = `${recipientNumber}@c.us`;

        await client.sendMessage(jid, "Connection Testing");

        return NextResponse.json({ ok: true, message: "Test message sent." });
    } catch (error) {
        console.error("Test message error:", error);
        return NextResponse.json(
            { error: "Failed to send test message." },
            { status: 500 }
        );
    }
}
