"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ProfileData {
  email: string;
  notifyNumber: string | null;
  webhookUrl: string | null;
  geminiApiKey: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notifyNumber, setNotifyNumber] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/profile");

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch profile");
      }

      const data = await response.json();
      setProfile(data);
      setNotifyNumber(data.notifyNumber || "");
      setWebhookUrl(data.webhookUrl || "");
    } catch (err) {
      console.error("Profile load error:", err);
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    setSubmitting(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyNumber: notifyNumber.trim() || null,
          webhookUrl: webhookUrl.trim() || null,
          geminiApiKey: geminiApiKey.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      const data = await response.json();
      setProfile(data);
      setNotifyNumber(data.notifyNumber || "");
      setWebhookUrl(data.webhookUrl || "");
      setGeminiApiKey(data.geminiApiKey || "");
      setSuccess("Profile updated successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Profile
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Manage your account and notification settings
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
          {success}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                type="email"
                value={profile?.email || ""}
                disabled
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Email cannot be changed
              </p>
            </div>

            {/* Notification Number Field */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Notification Number
              </label>
              <input
                type="text"
                value={notifyNumber}
                onChange={(e) => setNotifyNumber(e.target.value)}
                placeholder="8801XXXXXXXX"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                This is the WhatsApp number where reminders will be sent. It can be different from your login device number.
              </p>
            </div>

            {/* Webhook URL Field */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Webhook URL <span className="text-zinc-400">(Optional)</span>
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-webhook-url.com/endpoint"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                When a reminder is sent, we'll POST a JSON payload to this URL. Leave empty to disable webhooks.
              </p>
            </div>

            {/* Gemini API Key Field */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Gemini API Key <span className="text-zinc-400">(Optional)</span>
              </label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Enter your Google Gemini API key"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-white dark:focus:ring-white"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Your Google Gemini API key for AI-powered features. This key is stored securely and will be used to generate friendly reminder messages.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-black px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

