import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import LogoutButton from "./logout-button";
import Link from "next/link";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/app"
              className="text-xl font-semibold text-black dark:text-zinc-50 hover:opacity-80"
            >
              WhatsTask
            </Link>
            <nav className="hidden sm:flex items-center gap-4">
              <Link
                href="/app/todos"
                className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
              >
                Todos
              </Link>
              <Link
                href="/app/whatsapp"
                className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
              >
                WhatsApp
              </Link>
              <Link
                href="/app/logs"
                className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
              >
                Reminder Logs
              </Link>
              <Link
                href="/app/profile"
                className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
              >
                Profile
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

