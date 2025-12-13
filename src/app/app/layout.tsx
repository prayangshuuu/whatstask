import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import Sidebar from "@/components/Sidebar";
import QuickAddButton from "@/components/QuickAddButton";

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
    <div className="flex h-screen overflow-hidden bg-wa-bg">
      {/* Sidebar - Clean SaaS Style */}
      <Sidebar userEmail={user.email} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:ml-64 bg-wa-bg">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Quick Add FAB */}
      <QuickAddButton />
    </div>
  );
}
