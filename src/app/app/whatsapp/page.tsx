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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
  }, []);

  // Poll session every 3 seconds if status is "connecting" or "qr_pending"
  useEffect(() => {
    if (!session || (session.status !== "connecting" && session.status !== "qr_pending")) {
      return;
    }

    const pollInterval = setInterval(() => {
      // Fetch session without setting loading state during polling
      fetch("/api/whatsapp/session")
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Failed to fetch session");
        })
        .then((data) => {
          if (!data || data.status === "none") {
            setSession(null);
          } else {
            setSession(data);
            // Debug logging
            if (data.status === "connecting" || data.status === "qr_pending") {
              console.log(`[WhatsApp UI] Polled session: status=${data.status}, qrData=${data.qrData ? `exists (${data.qrData.length} chars)` : "null"}`);
              if (data.qrData) {
                console.log(`[WhatsApp UI] ✅ QR CODE FOUND! First 50 chars: ${data.qrData.substring(0, 50)}...`);
              }
            }
            // Stop polling if status changed to disconnected or ready
            if (data.status === "disconnected" || data.status === "ready" || data.status === "error") {
              return; // useEffect cleanup will clear interval
            }
          }
          setError(null);
        })
        .catch((err) => {
          console.error("[WhatsApp UI] Error polling WhatsApp session:", err);
          // Don't set error during polling to avoid disrupting UX
        });
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [session?.status]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const [notifyNumber, setNotifyNumber] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setNotifyNumber(data.notifyNumber);
      }
    } catch (e) {
      console.error("Failed to fetch profile for whatsapp page", e);
    }
  };

  const fetchSession = async (setLoadingState = true) => {
    try {
      if (setLoadingState) {
        setLoading(true);
      }
      setError(null);
      const response = await fetch("/api/whatsapp/session");

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch session");
      }

      const data = await response.json();
      // Handle null or "none" status properly
      if (!data || data.status === "none") {
        setSession(null);
      } else {
        setSession(data);
      }
      setError(null);
    } catch (err) {
      setError("Could not load WhatsApp status. Please refresh the page or check the logs.");
      console.error("Error fetching WhatsApp session:", err);
    } finally {
      if (setLoadingState) {
        setLoading(false);
      }
    }
  };

  const handleStartQR = async () => {
    setSubmitting(true);
    setError("");
    setSuccess(null);

    try {
      const response = await fetch("/api/whatsapp/session", {
        method: "POST",
      });

      if (!response.ok) {
        // Try to read error message from response
        let errorMessage = "Could not start WhatsApp session. Please try again.";
        try {
          const data = await response.json();
          if (data.error) {
            errorMessage = data.error;
          }
        } catch (parseError) {
          // If JSON parsing fails, use default message
          console.error("Failed to parse error response:", parseError);
        }
        setError(`Error: ${errorMessage}`);
        setSubmitting(false);
        return;
      }

      const data = await response.json();
      // Handle response properly
      if (!data || data.status === "none") {
        setSession(null);
      } else {
        setSession(data);
      }
      setError(null);

      // Polling will start automatically via useEffect when status becomes "connecting"
    } catch (err) {
      console.error("Error starting WhatsApp session:", err);
      setError("Error: Could not start WhatsApp session. Please refresh the page or check the logs.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopQR = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/whatsapp/stop", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to stop QR generation");
      }

      // Refetch session to reflect stopped/disconnected status
      await fetchSession(false);
      setError(null);
      console.log("[WhatsApp UI] ✅ QR generation stopped");
    } catch (err) {
      console.error("[WhatsApp UI] Error stopping QR generation:", err);
      setError(err instanceof Error ? err.message : "Failed to stop QR generation");
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
    setSuccess(null);

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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to logout");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestMessage = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/whatsapp/test", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send test message");
      }

      setSuccess("Test message sent to your notification number.");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          WhatsApp Connection
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Connect your WhatsApp account to receive reminder notifications
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 sm:p-4 text-sm text-destructive">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <span className="flex-1">{error}</span>
            <button
              onClick={() => {
                setError("");
                fetchSession();
              }}
              className="rounded-md bg-destructive/20 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/30 shrink-0"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
          {success}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">Loading WhatsApp status...</p>
        </div>
      ) : !session || session.status === "none" || session.status === "disconnected" || session.status === "error" ? (
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

          {/* Test Message Section */}
          <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <h4 className="font-medium text-black dark:text-zinc-50 mb-2">Test Notification</h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Send a test message to your notification number to verify the setup.
            </p>

            {!notifyNumber ? (
              <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 mb-2">
                Please set your <strong>Notification Number</strong> in <Link href="/profile" className="underline">Profile</Link> settings first.
              </div>
            ) : (
              <button
                onClick={handleTestMessage}
                disabled={submitting}
                className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send Test Message"}
              </button>
            )}
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
      ) : session.status === "connecting" ? (
        // Connecting - show QR code if available, otherwise waiting message
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
              Connecting WhatsApp
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleStopQR}
                disabled={submitting}
                className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent dark:border-red-400"></div>
                    <span>Stopping...</span>
                  </>
                ) : (
                  <>
                    <span>✕</span>
                    <span>Stop QR</span>
                  </>
                )}
              </button>
              <button
                onClick={handleStartQR}
                disabled={submitting}
                className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent dark:border-zinc-400"></div>
                    <span>Restarting...</span>
                  </>
                ) : (
                  "Restart QR"
                )}
              </button>
            </div>
          </div>

          {session.qrData ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
              <img
                src={session.qrData}
                alt="WhatsApp QR code"
                className="w-64 h-64 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700"
              />
              <p className="text-sm text-zinc-700 dark:text-zinc-300 text-center">
                Open WhatsApp → Linked Devices → Link a device and scan this QR.
              </p>
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
      ) : session.status === "qr_pending" ? (
        // QR Pending - show QR code if available
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
              Scan WhatsApp QR Code
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleStopQR}
                disabled={submitting}
                className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent dark:border-red-400"></div>
                    <span>Stopping...</span>
                  </>
                ) : (
                  <>
                    <span>✕</span>
                    <span>Stop QR</span>
                  </>
                )}
              </button>
              <button
                onClick={handleStartQR}
                disabled={submitting}
                className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent dark:border-zinc-400"></div>
                    <span>Restarting...</span>
                  </>
                ) : (
                  "Restart QR"
                )}
              </button>
            </div>
          </div>

          {session.qrData ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
              <img
                src={session.qrData}
                alt="WhatsApp QR code"
                className="w-64 h-64 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700"
              />
              <p className="text-sm text-zinc-700 dark:text-zinc-300 text-center">
                Open WhatsApp → Linked Devices → Link a device and scan this QR.
              </p>
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
              className="rounded-md bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                "Scan WhatsApp QR"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
