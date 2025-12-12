"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface WhatsAppSession {
  status: string;
  qrData: string | null;
  lastQrAt: string | null;
  lastConnectedAt: string | null;
  waNumberRaw: string | null;
  waDisplayName: string | null;
  waProfilePicUrl: string | null;
}

export default function WhatsAppPage() {
  const router = useRouter();
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSession();
  }, []);

  // Poll session every 3 seconds if status is "connecting" or "qr_pending"
  useEffect(() => {
    if (!session || (session.status !== "connecting" && session.status !== "qr_pending")) {
      return;
    }

    const pollInterval = setInterval(() => {
      fetchSession();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [session?.status]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/whatsapp/session");

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch session");
      }

      const data = await response.json();
      setSession(data);
      setError("");
    } catch (err) {
      setError("Could not load WhatsApp status. Please refresh.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQR = async () => {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/whatsapp/session", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start QR session");
      }

      const data = await response.json();
      setSession(data);
      setError("");
      // Start polling after starting QR
      fetchSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start QR session");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to disconnect from WhatsApp?")) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/whatsapp/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to logout");
      }

      // Refetch session to reflect disconnected status
      await fetchSession();
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to logout");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
          WhatsApp Connection
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Connect your WhatsApp account to receive reminder notifications
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchSession}
              className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">Loading WhatsApp status...</p>
        </div>
      ) : !session || session.status === "none" ? (
        // No session - show "Scan WhatsApp QR" button
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-2">
              WhatsApp is not connected.
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              Click the button below to generate a QR code and connect your WhatsApp account.
            </p>
            <button
              onClick={handleStartQR}
              disabled={submitting}
              className="rounded-md bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Starting..." : "Scan WhatsApp QR"}
            </button>
          </div>
        </div>
      ) : session.status === "ready" ? (
        // Connected - show profile and logout
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
                WhatsApp connected ✅
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Status: Connected
              </p>
            </div>
            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400">
              Connected
            </span>
          </div>

          {/* Profile Card */}
          <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="flex items-center gap-4">
              {session.waProfilePicUrl ? (
                <img
                  src={session.waProfilePicUrl}
                  alt="WhatsApp Profile"
                  className="h-16 w-16 rounded-full border-2 border-zinc-200 dark:border-zinc-700"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-zinc-200 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700">
                  <span className="text-2xl">👤</span>
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Name
                </p>
                <p className="text-lg font-semibold text-black dark:text-zinc-50">
                  {session.waDisplayName || "Unknown"}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Connected Number: {session.waNumberRaw || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={submitting}
            className="w-full rounded-md bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Disconnecting..." : "Logout from WhatsApp"}
          </button>
        </div>
      ) : session.status === "connecting" || session.status === "qr_pending" ? (
        // Connecting/QR Pending - show QR code and restart button
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
              Connecting WhatsApp
            </h3>
            <button
              onClick={handleStartQR}
              disabled={submitting}
              className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {submitting ? "Restarting..." : "Restart QR"}
            </button>
          </div>

          {session.qrData ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
                <img
                  src={session.qrData}
                  alt="WhatsApp QR Code"
                  className="rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700"
                />
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Scan this QR code with WhatsApp
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Open WhatsApp → Linked Devices → Link a device and scan this QR.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600 dark:border-blue-600 dark:border-t-blue-400"></div>
                <p>Waiting for QR code...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Disconnected or error - show reconnect option
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-center">
            <div className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
              <p>
                WhatsApp is disconnected. Click "Scan WhatsApp QR" to reconnect.
              </p>
            </div>
            <button
              onClick={handleStartQR}
              disabled={submitting}
              className="rounded-md bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Starting..." : "Scan WhatsApp QR"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
