"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 sm:space-y-8 py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="border-b border-border pb-4 sm:pb-5">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          Settings
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Manage your account, notifications, and AI preferences.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 sm:p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
          {success}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-lg bg-muted"></div>
          <div className="h-32 rounded-lg bg-muted"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Account Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="mt-1.5 bg-muted cursor-not-allowed"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">WhatsApp Notifications</CardTitle>
              <CardDescription>Where should we send your reminders?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notifyNumber">Notification Number</Label>
                <Input
                  id="notifyNumber"
                  type="text"
                  value={notifyNumber}
                  onChange={(e) => setNotifyNumber(e.target.value)}
                  placeholder="e.g. 8801XXXXXXXX"
                  className="mt-1.5"
                />
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                  Include country code without '+'. This can be different from your connected WhatsApp session.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Configuration Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg sm:text-xl">AI Configuration</CardTitle>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  New
                </Badge>
              </div>
              <CardDescription>Enable AI-powered task creation and smart reminders.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="geminiApiKey">Gemini API Key</Label>
                <Input
                  id="geminiApiKey"
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="mt-1.5"
                />
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                  Get your free key from{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google AI Studio
                  </a>
                  .
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Developer Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Developer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="webhookUrl">
                  Webhook URL <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-webhook-url.com/endpoint"
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto">
              {submitting ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
