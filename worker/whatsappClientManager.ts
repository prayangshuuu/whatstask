import { Client, LocalAuth } from "whatsapp-web.js";
import * as qrcode from "qrcode";
import * as dotenv from "dotenv";
import { prisma } from "../src/lib/prisma";

// Load environment variables
dotenv.config();

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
async function startWhatsAppClientForUser(
  userId: string
): Promise<Client | null> {
  // If we already have a client for this user, just return it
  if (clients.has(userId)) {
    return clients.get(userId)!;
  }

  // Find session row
  const session = await prisma.whatsAppSession.findUnique({
    where: { userId },
  });

  if (!session) {
    console.warn("No WhatsAppSession row for user", userId, "cannot start client");
    return null;
  }

  // Create client with LocalAuth (clientId ensures separate session per user)
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `user-${userId}`,
    }),
    puppeteer: {
      headless: true,
    },
  });

  // Handle QR event: generate base64 and store in DB
  client.on("qr", async (qr) => {
    try {
      const qrDataUrl = await qrcode.toDataURL(qr);
      await prisma.whatsAppSession.update({
        where: { userId },
        data: {
          status: "qr_pending",
          qrData: qrDataUrl,
          lastQrAt: new Date(),
        },
      });
      console.log("QR generated and stored for user", userId);
    } catch (err) {
      console.error("Failed to store QR for user", userId, err);
    }
  });

  // Handle ready event: mark as connected and fetch profile info
  client.on("ready", async () => {
    try {
      const info = client.info;
      const wid = info?.wid?._serialized ?? "";
      const waNumberRaw = wid.replace("@c.us", "") || null;
      const waDisplayName = info.pushname || info.me?.name || null;

      let waProfilePicUrl: string | null = null;
      try {
        if (wid) {
          waProfilePicUrl = await client.getProfilePicUrl(wid);
        }
      } catch (picErr) {
        console.warn("Could not fetch profile picture for user", userId, picErr);
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

      console.log("WhatsApp client ready for user", userId, waNumberRaw, waDisplayName);
    } catch (err) {
      console.error("Error updating WhatsApp ready state for user", userId, err);
    }
  });

  // Handle disconnected
  client.on("disconnected", async (reason) => {
    console.warn("WhatsApp client disconnected for user", userId, reason);
    clients.delete(userId);
    try {
      await prisma.whatsAppSession.update({
        where: { userId },
        data: {
          status: "disconnected",
        },
      });
    } catch (err) {
      console.error("Error marking session disconnected for user", userId, err);
    }
  });

  // Optional: auth failure handler
  client.on("auth_failure", async (msg) => {
    console.error("Auth failure for user", userId, msg);
    try {
      await prisma.whatsAppSession.update({
        where: { userId },
        data: {
          status: "error",
        },
      });
    } catch (err) {
      console.error("Error marking auth failure for user", userId, err);
    }
  });

  client.initialize();
  clients.set(userId, client);
  console.log("WhatsApp client initialized for user", userId);

  return client;
}

function getWhatsAppClientForUser(userId: string) {
  return clients.get(userId) ?? null;
}

export { startWhatsAppClientForUser, getWhatsAppClientForUser };

