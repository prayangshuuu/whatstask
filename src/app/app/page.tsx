import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DashboardTodos from "@/components/DashboardTodos";

export default async function AppPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all todos for the user
  const todos = await prisma.todo.findMany({
    where: { userId: user.id },
    orderBy: { remindAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      remindAt: true,
      repeatType: true,
      isCompleted: true,
      aiMessage: true,
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-[#e9edef]">
            My Tasks
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-[#8696a0]">
            Manage your reminders and stay organized
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/app/todos"
            className="rounded-md bg-[#008069] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#00a884]"
          >
            New Task
          </Link>
          <Link
            href="/app/todos"
            className="rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-purple-700 hover:to-pink-700"
          >
            🤖 AI Plan
          </Link>
        </div>
      </div>

      {/* Todos Grid */}
      <DashboardTodos todos={todos} />
    </div>
  );
}
