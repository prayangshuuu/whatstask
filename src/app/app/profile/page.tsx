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
      setGeminiApiKey(data.geminiApiKey || "");
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
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <div className="border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Settings
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Manage your account, notifications, and AI preferences.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
          {success}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-lg bg-zinc-100 dark:bg-zinc-800"></div>
          <div className="h-32 rounded-lg bg-zinc-100 dark:bg-zinc-800"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Section */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Account Details</h3>
            <div className="mt-4 grid gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">WhatsApp Notifications</h3>
            <p className="mt-1 text-sm text-zinc-500">Where should we send your reminders?</p>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Notification Number
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={notifyNumber}
                  onChange={(e) => setNotifyNumber(e.target.value)}
                  placeholder="e.g. 8801XXXXXXXX"
                  className="block w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 shadow-sm focus:border-[#008069] focus:ring-[#008069] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-[#008069]"
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Include country code without '+'. This can be different from your connected WhatsApp session.
              </p>
            </div>
          </div>

          {/* AI Configuration Section */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">AI Configuration</h3>
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                New
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">Enable AI-powered task creation and smart reminders.</p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Gemini API Key
              </label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 shadow-sm focus:border-[#008069] focus:ring-[#008069] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-[#008069]"
              />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Get your free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[#008069] hover:underline">Google AI Studio</a>.
              </p>
            </div>
          </div>

          {/* Developer Section */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Developer</h3>
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Webhook URL <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-webhook-url.com/endpoint"
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-900 shadow-sm focus:border-[#008069] focus:ring-[#008069] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-[#008069]"
              />
            </div>
          </div>

          {/* Sticky Action Bar */}
          <div className="sticky bottom-6 flex justify-end rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-lg backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/80">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#008069] px-6 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-[#006d59] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#008069]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
