import Link from "next/link";
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AppPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user with notifyNumber
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      notifyNumber: true,
    },
  });

  if (!currentUser) {
    redirect("/login");
  }

  // Fetch WhatsAppSession
  const whatsappSession = await prisma.whatsAppSession.findUnique({
    where: { userId: user.id },
    select: {
      status: true,
    },
  });

  // Count todos
  const todoCount = await prisma.todo.count({
    where: { userId: user.id },
  });

  // Compute step statuses
  const step1ConnectedWhatsApp = whatsappSession?.status === "ready";
  const step2ProfileNumberSet = !!currentUser.notifyNumber && currentUser.notifyNumber.trim() !== "";
  const step3HasTodos = todoCount > 0;

  const allStepsDone = step1ConnectedWhatsApp && step2ProfileNumberSet && step3HasTodos;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-black dark:text-zinc-50">
          Welcome, {currentUser.email}
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage your tasks and reminders with WhatsApp notifications.
        </p>
      </div>

      {/* Progress Section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
            {allStepsDone ? "You're all set! ✅" : "Getting started"}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {allStepsDone
              ? "You've completed all setup steps. Start creating reminders!"
              : "Complete these steps to start receiving WhatsApp reminders."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Step 1: Connect WhatsApp */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-black dark:text-zinc-50">
                1. Connect WhatsApp
              </h4>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  step1ConnectedWhatsApp
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                }`}
              >
                {step1ConnectedWhatsApp ? "Done" : "Not done"}
              </span>
            </div>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Scan a WhatsApp QR so WhatsTask can send reminders.
            </p>
            <Link
              href="/app/whatsapp"
              className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {step1ConnectedWhatsApp ? "Manage WhatsApp" : "Connect WhatsApp"}
            </Link>
          </div>

          {/* Step 2: Set Notification Number */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-black dark:text-zinc-50">
                2. Set Notification Number
              </h4>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  step2ProfileNumberSet
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                }`}
              >
                {step2ProfileNumberSet ? "Done" : "Not done"}
              </span>
            </div>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Set the WhatsApp number where you want to receive reminders.
            </p>
            <Link
              href="/app/profile"
              className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {step2ProfileNumberSet ? "Update Profile" : "Set Notification Number"}
            </Link>
          </div>

          {/* Step 3: Create First Todo */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-black dark:text-zinc-50">
                3. Create Your First To-Do
              </h4>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  step3HasTodos
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                }`}
              >
                {step3HasTodos ? "Done" : "Not done"}
              </span>
            </div>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Add a reminder so WhatsTask can ping you at the right time.
            </p>
            <Link
              href="/app/todos"
              className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {step3HasTodos ? "Manage To-Dos" : "Create First To-Do"}
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/app/todos"
          className="group rounded-lg border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h3 className="text-lg font-semibold text-black group-hover:text-zinc-700 dark:text-zinc-50 dark:group-hover:text-zinc-300">
            Manage To-Dos
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Create and manage your tasks and reminders
          </p>
        </Link>

        <Link
          href="/app/whatsapp"
          className="group rounded-lg border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h3 className="text-lg font-semibold text-black group-hover:text-zinc-700 dark:text-zinc-50 dark:group-hover:text-zinc-300">
            Connect WhatsApp
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Connect your WhatsApp number to receive notifications
          </p>
        </Link>

        <Link
          href="/app/logs"
          className="group rounded-lg border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h3 className="text-lg font-semibold text-black group-hover:text-zinc-700 dark:text-zinc-50 dark:group-hover:text-zinc-300">
            Reminder Logs
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            View history of reminder notifications sent via WhatsApp
          </p>
        </Link>
      </div>
    </div>
  );
}

