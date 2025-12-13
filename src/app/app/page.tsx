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

  return (
    <div className="space-y-6">
      <DashboardHeader whatsappSession={whatsappSession} />
      <DashboardTodos todos={todos} />
    </div>
  );
}
