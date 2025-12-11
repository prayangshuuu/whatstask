import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  const user = await getCurrentUser(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-8 text-center px-8">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50">
          WhatsTask – WhatsApp Reminder Engine
        </h1>
        <Link
          href={user ? "/app" : "/login"}
          className="flex h-12 items-center justify-center rounded-full bg-black px-8 text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {user ? "Go to Dashboard" : "Login to Continue"}
        </Link>
      </main>
    </div>
  );
}
