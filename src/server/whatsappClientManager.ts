import { Client, LocalAuth } from "whatsapp-web.js";
import * as qrcode from "qrcode";
import { prisma } from "@/lib/prisma";

/**
 * In-memory map to store active WhatsApp clients per user.
 * Key: userId, Value: Client
 */
const clients = new Map<string, Client>();

/**
 * Start a WhatsApp client for a specific user.
 * If a client already exists, returns the existing client.
 * Otherwise, creates a new client, sets up event handlers, and initializes it.
 */
export async function startWhatsAppClientForUser(
  userId: string
): Promise<Client | null> {
  // If we already have a client for this user, just return it
  if (clients.has(userId)) {
    const existingClient = clients.get(userId)!;
    console.log(`[WhatsApp Client] Using existing client for user ${userId}`);
    return existingClient;
  }

  // Ensure session row exists - create or update it
  let session = await prisma.whatsAppSession.findUnique({
    where: { userId },
  });

  if (!session) {
    // Create session if it doesn't exist
    console.log(`[WhatsApp Client] Creating WhatsAppSession row for user ${userId}`);
    session = await prisma.whatsAppSession.create({
      data: {
        userId,
        phoneNumber: null,
        status: "connecting",
        qrData: null,
      },
    });
  } else {
    // Update existing session to connecting state
    await prisma.whatsAppSession.update({
      where: { userId },
      data: {
        status: "connecting",
        qrData: null,
      },
    });
  }

  console.log(`[WhatsApp Client] Creating client for user ${userId}, session status: ${session.status}`);

  // Create client with LocalAuth (clientId ensures separate session per user)
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `user-${userId}`,
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  // Handle loading_screen event to track initialization progress
  client.on("loading_screen", (percent, message) => {
    console.log(`[WhatsApp Client] Loading screen for user ${userId}: ${percent}% - ${message}`);
  });

  // Handle QR event: generate base64 and store in DB
  client.on("qr", async (qr) => {
    console.log(`[WhatsApp Client] ⚡ QR event received for user ${userId}`);
    try {
      const qrDataUrl = await qrcode.toDataURL(qr);
      console.log(`[WhatsApp Client] QR code generated as data URL for user ${userId}, length: ${qrDataUrl.length}`);
      
      const updated = await prisma.whatsAppSession.update({
        where: { userId },
        data: {
          status: "qr_pending",
          qrData: qrDataUrl,
          lastQrAt: new Date(),
        },
      });
      
      console.log(`[WhatsApp Client] ✅ QR generated and stored for user ${userId}, qrData length: ${updated.qrData?.length || 0}`);
    } catch (err) {
      console.error(`[WhatsApp Client] ❌ Failed to store QR for user ${userId}:`, err);
    }
  });

  // Handle ready event: mark as connected and fetch profile info
  client.on("ready", async () => {
    try {
      const info = client.info;
      const wid = info?.wid?._serialized ?? "";
      const waNumberRaw = wid.replace("@c.us", "") || null;
      const waDisplayName = info.pushname || null;

      let waProfilePicUrl: string | null = null;
      try {
        if (wid) {
          waProfilePicUrl = await client.getProfilePicUrl(wid);
        }
      } catch (picErr) {
        console.warn(`[WhatsApp Client] Could not fetch profile picture for user ${userId}:`, picErr);
      }

      await prisma.whatsAppSession.update({
        where: { userId },
        data: {
          status: "ready",
          qrData: null,
          waNumberRaw,
          waDisplayName,
          waProfilePicUrl,
          lastConnectedAt: new Date(),
        },
      });

      console.log(`[WhatsApp Client] ✅ WhatsApp client ready for user ${userId}, number: ${waNumberRaw}, name: ${waDisplayName}`);
    } catch (err) {
      console.error(`[WhatsApp Client] ❌ Error updating WhatsApp ready state for user ${userId}:`, err);
    }
  });

  // Handle disconnected
  client.on("disconnected", async (reason) => {
    console.warn(`[WhatsApp Client] ⚠️  WhatsApp client disconnected for user ${userId}, reason: ${reason}`);
    clients.delete(userId);
    try {
      await prisma.whatsAppSession.update({
        where: { userId },
        data: {
          status: "disconnected",
        },
      });
    } catch (err) {
      console.error(`[WhatsApp Client] ❌ Error marking session disconnected for user ${userId}:`, err);
    }
  });

  // Handle auth failure
  client.on("auth_failure", async (msg) => {
    console.error(`[WhatsApp Client] ❌ Auth failure for user ${userId}:`, msg);
    clients.delete(userId);
    try {
      await prisma.whatsAppSession.update({
        where: { userId },
        data: {
          status: "error",
        },
      });
    } catch (err) {
      console.error(`[WhatsApp Client] ❌ Error marking auth failure for user ${userId}:`, err);
    }
  });

  // Store client in map before initializing
  clients.set(userId, client);
  
  console.log(`[WhatsApp Client] 🚀 Starting initialization for user ${userId}...`);
  
  // Initialize client (this is async - events will fire asynchronously)
  client.initialize()
    .then(() => {
      console.log(`[WhatsApp Client] ✅ Client initialization completed for user ${userId}`);
    })
    .catch((err) => {
      console.error(`[WhatsApp Client] ❌ Error initializing WhatsApp client for user ${userId}:`, err);
      clients.delete(userId);
      // Update session status to error
      prisma.whatsAppSession.update({
        where: { userId },
        data: { status: "error" },
      }).catch((dbErr) => {
        console.error(`[WhatsApp Client] Failed to update status to error:`, dbErr);
      });
    });
  
  console.log(`[WhatsApp Client] Client initialization started for user ${userId} (async, QR will be generated soon)`);

  return client;
}

export function getWhatsAppClientForUser(userId: string): Client | null {
  return clients.get(userId) ?? null;
}

/**
 * Stop and destroy a WhatsApp client for a specific user.
 * This will:
 * - Destroy the client gracefully
 * - Remove it from the map
 * - Prevent any further QR events
 */
export async function stopWhatsAppClientForUser(userId: string): Promise<boolean> {
  const client = clients.get(userId);
  
  if (!client) {
    console.log(`[WhatsApp Client] No client found for user ${userId} to stop`);
    return false;
  }

  try {
    console.log(`[WhatsApp Client] Stopping client for user ${userId}...`);
    
    // Remove from map first to prevent new events
    clients.delete(userId);
    
    // Destroy the client gracefully
    await client.destroy();
    
    console.log(`[WhatsApp Client] ✅ Client stopped and destroyed for user ${userId}`);
    return true;
  } catch (err) {
    console.error(`[WhatsApp Client] ❌ Error stopping client for user ${userId}:`, err);
    // Ensure it's removed from map even if destroy fails
    clients.delete(userId);
    return false;
  }
}

