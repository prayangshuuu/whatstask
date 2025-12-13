import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardTodos from "@/components/DashboardTodos";
import DashboardHeader from "@/components/DashboardHeader";

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
      <DashboardHeader />
      <DashboardTodos todos={todos} />
    </div>
  );
}
