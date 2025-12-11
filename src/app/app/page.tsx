import Link from "next/link";
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";

export default async function AppPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-black dark:text-zinc-50">
          Welcome, {user.email}
        </h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage your tasks and reminders with WhatsApp notifications.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
    </div>
  );
}

