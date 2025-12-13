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
  });

  // Fetch WhatsApp session status
  const whatsappSession = await prisma.whatsAppSession.findUnique({
    where: { userId: user.id },
    select: {
      status: true,
      waNumberRaw: true,
      waDisplayName: true,
      waProfilePicUrl: true,
    },
  });

  // Map todos to match the expected interface (handle field name differences)
  const mappedTodos = todos.map(todo => ({
    id: todo.id,
    title: todo.title,
    description: todo.description,
    remindAt: todo.remindAt,
    repeatType: todo.repeatType,
    isCompleted: todo.isCompleted,
    aiMessage: (todo as any).aiMessage || (todo as any).aiGeneratedMessage || null,
  }));

  return (
    <div className="space-y-6">
      <DashboardHeader whatsappSession={whatsappSession} />
      <DashboardTodos todos={mappedTodos} />
    </div>
  );
}
