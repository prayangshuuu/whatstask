import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";

/**
 * Normalize phone number:
 * - Strip spaces and non-digits
 * - TODO: Add country-specific normalization (e.g., BD numbers starting with 0 -> 880...)
 */
function normalizePhoneNumber(number: string): string | null {
  if (!number || !number.trim()) {
    return null;
  }

  // Strip all non-digit characters
  const digitsOnly = number.replace(/[^0-9]/g, "");

  if (digitsOnly.length === 0) {
    return null;
  }

  // TODO: Add country-specific normalization
  // For example, if targeting Bangladesh:
  // if (digitsOnly.startsWith("0") && digitsOnly.length === 11) {
  //   return "880" + digitsOnly.substring(1);
  // }

  return digitsOnly;
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user with notifyNumber, webhookUrl, and geminiApiKey
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        notifyNumber: true,
        webhookUrl: true,
        geminiApiKey: true,
      },
    });

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: userData.id,
      email: userData.email,
      notifyNumber: userData.notifyNumber,
      webhookUrl: userData.webhookUrl,
      geminiApiKey: userData.geminiApiKey,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notifyNumber, webhookUrl, geminiApiKey } = body;

    // Normalize phone number
    const normalizedNumber = notifyNumber
      ? normalizePhoneNumber(notifyNumber)
      : null;

    // Validate webhook URL if provided
    let normalizedWebhookUrl: string | null = null;
    if (webhookUrl && webhookUrl.trim()) {
      try {
        const url = new URL(webhookUrl.trim());
        // Only allow http/https
        if (url.protocol === "http:" || url.protocol === "https:") {
          normalizedWebhookUrl = url.toString();
        } else {
          return NextResponse.json(
            { error: "Webhook URL must use http:// or https://" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid webhook URL format" },
          { status: 400 }
        );
      }
    }

    // Normalize and validate Gemini API key if provided
    const normalizedGeminiApiKey: string | null = geminiApiKey && geminiApiKey.trim() 
      ? geminiApiKey.trim() 
      : null;

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        notifyNumber: normalizedNumber,
        webhookUrl: normalizedWebhookUrl,
        geminiApiKey: normalizedGeminiApiKey,
      },
      select: {
        email: true,
        notifyNumber: true,
        webhookUrl: true,
        geminiApiKey: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

