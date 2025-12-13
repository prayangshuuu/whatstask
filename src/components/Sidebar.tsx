"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ProfileMenu from "./ProfileMenu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Home, MessageCircle, User, X, Menu } from "lucide-react";

interface SidebarProps {
  userEmail: string;
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const navItems = [
    {
      href: "/app",
      label: "Dashboard",
      icon: Home,
    },
    {
      href: "/app/whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
    },
    {
      href: "/app/profile",
      label: "Profile",
      icon: User,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/app") {
      return pathname === "/app";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Clean SaaS Style */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          "bg-white border-r border-border shadow-sm",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 sm:px-6 py-4 sm:py-5 bg-white">
            <Link
              href="/app"
              className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <MessageCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold">WhatsTask</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 sm:px-3 py-4 bg-white">
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Button
                    key={item.href}
                    asChild
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 h-11 text-sm font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-semibold"
                        : "text-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Link href={item.href}>
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </nav>

          <Separator />

          {/* Profile Menu */}
          <div className="p-3 sm:p-4 bg-white">
            <ProfileMenu email={userEmail} />
          </div>
        </div>
      </aside>

      {/* Mobile Hamburger Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-30 lg:hidden shadow-lg bg-white"
        size="icon"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
    </>
  );
}
