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
  waNumberRaw: string | null;
  waDisplayName: string | null;
  waProfilePicUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

type ConnectionMethod = "qr" | "code";

export default function WhatsAppPage() {
  const router = useRouter();
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>("qr");

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

  const isConnected = session?.status === "ready";
  const showConnectForm = !session || !isConnected;

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
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      ) : isConnected ? (
        // Connected State: Show profile and logout
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
                  WhatsApp Name
                </p>
                <p className="text-lg font-semibold text-black dark:text-zinc-50">
                  {session.waDisplayName || "Unknown"}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Connected Number: {session.waNumberRaw || session.phoneNumber}
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
            {submitting ? "Disconnecting..." : "Disconnect / Logout from WhatsApp"}
          </button>
        </div>
      ) : (
        // Not Connected State: Show connect form
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
              WhatsApp is not connected yet.
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Enter your login number and connect using QR.
            </p>
          </div>

          {/* Connection Method Tabs */}
          <div className="mb-6 flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setConnectionMethod("qr")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                connectionMethod === "qr"
                  ? "border-b-2 border-black text-black dark:border-white dark:text-white"
                  : "text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              Scan QR
            </button>
            <button
              onClick={() => setConnectionMethod("code")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                connectionMethod === "code"
                  ? "border-b-2 border-black text-black dark:border-white dark:text-white"
                  : "text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              Link with code
            </button>
          </div>

          {/* Phone Number Form */}
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

            {connectionMethod === "qr" ? (
              <>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md bg-black px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  {submitting ? "Connecting..." : "Save & Start Connection"}
                </button>

                {/* QR Code Display */}
                {session?.status === "connecting" && (
                  <div className="mt-4 flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600 dark:border-blue-600 dark:border-t-blue-400"></div>
                    <p>Connecting... please wait, QR will appear soon.</p>
                  </div>
                )}

                {session?.status === "qr_pending" && session.qrData && (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-col items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
                      <img
                        src={session.qrData}
                        alt="WhatsApp QR Code"
                        className="rounded-lg border border-zinc-200 p-2 bg-white dark:border-zinc-700"
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
              </>
            ) : (
              <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                <p>
                  Link with code will be supported later. For now, please use "Scan QR".
                </p>
              </div>
            )}
          </form>

          {/* Status Display for non-ready states */}
          {session && session.status !== "connecting" && session.status !== "qr_pending" && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Status:
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    session.status === "disconnected"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      : session.status === "error"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                  }`}
                >
                  {session.status === "disconnected"
                    ? "Disconnected"
                    : session.status === "error"
                    ? "Error"
                    : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
