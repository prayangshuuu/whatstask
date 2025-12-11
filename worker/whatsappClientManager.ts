import { Client, LocalAuth } from "whatsapp-web.js";
import QRCode from "qrcode";
import * as dotenv from "dotenv";
import { prisma } from "../src/lib/prisma";

// Load environment variables
dotenv.config();

/**
 * In-memory map to store active WhatsApp clients per user.
 * Key: userId, Value: { client: Client, status: string }
 */
const clients = new Map<string, { client: Client; status: string }>();

/**
 * Start a WhatsApp client for a specific user.
 * If a client already exists, returns the existing client.
 * Otherwise, creates a new client, sets up event handlers, and initializes it.
 */
export async function startWhatsAppClientForUser(
  userId: string
): Promise<Client | null> {
  // Check if client already exists
  const existing = clients.get(userId);
  if (existing) {
    console.log(`[WhatsApp Client] Client already exists for user ${userId}`);
    return existing.client;
  }

  // Fetch user's WhatsAppSession from database
  const session = await prisma.whatsAppSession.findUnique({
    where: { userId },
  });

  if (!session) {
    console.warn(
      `[WhatsApp Client] No WhatsAppSession found for user ${userId}`
    );
    return null;
  }

  if (!session.phoneNumber) {
    console.warn(
      `[WhatsApp Client] No phoneNumber set for user ${userId}`
    );
    return null;
  }

  console.log(
    `[WhatsApp Client] Starting client for user ${userId} (${session.phoneNumber})`
  );

  // Create new Client instance with LocalAuth
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: `user-${userId}` }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  // Hook QR event
  client.on("qr", async (qr) => {
    console.log(`[WhatsApp Client] QR code received for user ${userId}`);
    try {
      // Generate base64 data URL
      const qrDataUrl = await QRCode.toDataURL(qr);

      // Update WhatsAppSession in database
      await prisma.whatsAppSession.update({
        where: { userId },
        data: {
          status: "qr_pending",
          qrData: qrDataUrl,
          lastQrAt: new Date(),
        },
      });

      console.log(`[WhatsApp Client] QR code saved to database for user ${userId}`);
    } catch (error) {
      console.error(
        `[WhatsApp Client] Error generating QR code for user ${userId}:`,
        error
      );
    }
  });

  // Hook ready event
  client.on("ready", async () => {
    console.log(`[WhatsApp Client] Client ready for user ${userId}`);
    try {
      // Update WhatsAppSession in database
      await prisma.whatsAppSession.update({
        where: { userId },
        data: {
          status: "ready",
          qrData: null,
          lastConnectedAt: new Date(),
        },
      });

      // Update in-memory status
      const clientEntry = clients.get(userId);
      if (clientEntry) {
        clientEntry.status = "ready";
      }

      console.log(`[WhatsApp Client] Session marked as ready for user ${userId}`);
    } catch (error) {
      console.error(
        `[WhatsApp Client] Error updating ready status for user ${userId}:`,
        error
      );
    }
  });

  // Hook disconnected event
  client.on("disconnected", async (reason) => {
    console.log(
      `[WhatsApp Client] Client disconnected for user ${userId}, reason: ${reason}`
    );
    try {
      // Update WhatsAppSession in database
      await prisma.whatsAppSession.update({
        where: { userId },
        data: {
          status: "disconnected",
        },
      });

      // Remove client from map
      clients.delete(userId);

      console.log(`[WhatsApp Client] Client removed from map for user ${userId}`);
    } catch (error) {
      console.error(
        `[WhatsApp Client] Error updating disconnected status for user ${userId}:`,
        error
      );
    }
  });

  // Hook auth_failure event
  client.on("auth_failure", async (msg) => {
    console.error(
      `[WhatsApp Client] Auth failure for user ${userId}: ${msg}`
    );
    try {
      // Update WhatsAppSession in database
      await prisma.whatsAppSession.update({
        where: { userId },
        data: {
          status: "error",
        },
      });

      // Remove client from map
      clients.delete(userId);

      console.log(`[WhatsApp Client] Client removed due to auth failure for user ${userId}`);
    } catch (error) {
      console.error(
        `[WhatsApp Client] Error updating auth failure status for user ${userId}:`,
        error
      );
    }
  });

  // Hook loading_screen event (optional, for better logging)
  client.on("loading_screen", (percent, message) => {
    console.log(
      `[WhatsApp Client] Loading screen for user ${userId}: ${percent}% - ${message}`
    );
  });

  // Store in clients map with initial status
  clients.set(userId, { client, status: "connecting" });

  // Initialize the client
  try {
    await client.initialize();
    console.log(`[WhatsApp Client] Client initialized for user ${userId}`);
  } catch (error) {
    console.error(
      `[WhatsApp Client] Error initializing client for user ${userId}:`,
      error
    );
    // Remove from map on initialization failure
    clients.delete(userId);
    return null;
  }

  return client;
}

/**
 * Get an existing WhatsApp client for a user.
 * Returns null if no client exists for the user.
 */
export function getWhatsAppClientForUser(userId: string): Client | null {
  const entry = clients.get(userId);
  return entry ? entry.client : null;
}

/**
 * Get the status of a WhatsApp client for a user.
 * Returns null if no client exists for the user.
 */
export function getWhatsAppClientStatus(userId: string): string | null {
  const entry = clients.get(userId);
  return entry ? entry.status : null;
}

/**
 * Stop and remove a WhatsApp client for a user.
 */
export async function stopWhatsAppClientForUser(
  userId: string
): Promise<void> {
  const entry = clients.get(userId);
  if (entry) {
    try {
      await entry.client.destroy();
      console.log(`[WhatsApp Client] Client destroyed for user ${userId}`);
    } catch (error) {
      console.error(
        `[WhatsApp Client] Error destroying client for user ${userId}:`,
        error
      );
    }
    clients.delete(userId);
  }
}

/**
 * Get all active client user IDs.
 */
export function getActiveClientUserIds(): string[] {
  return Array.from(clients.keys());
}

