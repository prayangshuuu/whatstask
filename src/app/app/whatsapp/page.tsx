"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface WhatsAppSession {
  id: string;
  phoneNumber: string;
  status: string;
  qrData: string | null;
  lastQrAt: string | null;
  lastConnectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function WhatsAppPage() {
  const router = useRouter();
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    fetchSession();
  }, []);

  // Poll session every 4 seconds if status is "connecting" or "qr_pending"
  useEffect(() => {
    if (!session || (session.status !== "connecting" && session.status !== "qr_pending")) {
      return;
    }

    const pollInterval = setInterval(() => {
      fetchSession();
    }, 4000);

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
      if (data?.phoneNumber) {
        setPhoneNumber(data.phoneNumber);
      }
    } catch (err) {
      setError("Failed to load WhatsApp session");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phoneNumber.trim()) {
      setError("Phone number is required");
      return;
    }

    if (!phoneNumber.startsWith("+")) {
      setError("Phone number must start with + (e.g., +1234567890)");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/whatsapp/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update phone number");
      }

      const data = await response.json();
      setSession(data);
      setError("");
      // Start polling after submission
      fetchSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update phone number");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestartConnection = async () => {
    if (!session?.phoneNumber) return;
    
    setSubmitting(true);
    setError("");
    
    try {
      const response = await fetch("/api/whatsapp/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: session.phoneNumber }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to restart connection");
      }

      const data = await response.json();
      setSession(data);
      setError("");
      // Start polling after restart
      fetchSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restart connection");
    } finally {
      setSubmitting(false);
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "disconnected":
        return "Disconnected";
      case "qr_pending":
        return "QR Code Pending";
      case "ready":
        return "Ready";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "disconnected":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "qr_pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "ready":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      default:
        return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
          WhatsApp Settings
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Configure your WhatsApp number for reminders
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      ) : (
        <>
          {/* Connection Status Display */}
          {session && (
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
                Connection Status
              </h3>
              
              {/* Status: connecting */}
              {session.status === "connecting" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-black dark:border-zinc-600 dark:border-t-white"></div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      Connecting... please wait, QR will appear soon.
                    </p>
                  </div>
                </div>
              )}

              {/* Status: qr_pending */}
              {session.status === "qr_pending" && session.qrData && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    <img
                      src={session.qrData}
                      alt="WhatsApp QR Code"
                      className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700"
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
              )}

              {/* Status: ready */}
              {session.status === "ready" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 dark:text-green-400">✅</span>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      WhatsApp connected
                    </p>
                  </div>
                  {session.lastConnectedAt && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Connected at: {new Date(session.lastConnectedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Status: disconnected or error */}
              {(session.status === "disconnected" || session.status === "error") && (
                <div className="space-y-4">
                  <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                    <p>
                      {session.status === "disconnected"
                        ? "Connection was lost. Click below to restart."
                        : "Connection error occurred. Click below to retry."}
                    </p>
                  </div>
                  <button
                    onClick={handleRestartConnection}
                    disabled={submitting}
                    className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    {submitting ? "Restarting..." : "Restart Connection"}
                  </button>
                </div>
              )}

              {/* Status badge */}
              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Status:
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                      session.status
                    )}`}
                  >
                    {formatStatus(session.status)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Phone Number:
                  </span>
                  <span className="text-sm text-black dark:text-zinc-50">
                    {session.phoneNumber}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Phone Number Form */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
              {session ? "Update Phone Number" : "Set Phone Number"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  WhatsApp Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  required
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Include country code (e.g., +1 for US, +880 for Bangladesh)
                </p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-black px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {submitting ? "Saving..." : session ? "Save & Start Connection" : "Save & Start Connection"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

