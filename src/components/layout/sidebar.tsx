"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/session-provider";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { canAccessRoute } from "@/lib/role-access";
import {
  Home,
  CheckSquare,
  Wrench,
  Users,
  BarChart,
  Calendar,
  FileText,
  Package,
  DollarSign,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Ticket,
  Receipt,
  UserCircle,
  MessageSquare,
  Funnel,
  UserCheck,
  FolderKanban,
  ClipboardCheck,
} from "lucide-react";

const navigationItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Job Cards", href: "/jobcards", icon: Wrench },
  { label: "Inspections", href: "/inspections", icon: ClipboardCheck },
  { label: "Tickets", href: "/tickets", icon: Ticket },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Onboarding", href: "/customer-onboarding", icon: UserCheck },
  { label: "Staff Performance", href: "/staff", icon: BarChart },
  { label: "HR & Leave", href: "/hr", icon: Calendar },
  { label: "Payslips", href: "/payslips", icon: Receipt },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Finance", href: "/finance", icon: DollarSign },
  { label: "Sales Pipeline", href: "/sales-pipeline", icon: Funnel },
  { label: "My Portal", href: "/my-portal", icon: UserCircle },
  { label: "Meeting AI", href: "/meeting-ai", icon: MessageSquare },
  { label: "TRAXX AI", href: "/traxx", icon: Bot },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onOpenCommand?: () => void;
}

export function Sidebar({ collapsed, onToggle, onOpenCommand }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    setCustomLogo(localStorage.getItem("company-logo"));
    const handler = () => setCustomLogo(localStorage.getItem("company-logo"));
    window.addEventListener("company-logo-changed", handler);
    return () => window.removeEventListener("company-logo-changed", handler);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const logoSrc = customLogo || "/logo.svg";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-slate-900 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand / Logo */}
      <div className={cn("flex items-center justify-center bg-white", collapsed ? "h-16" : "h-16")}>
        <Link href="/" className="flex items-center overflow-hidden">
          {collapsed ? (
            customLogo ? (
              <img src={customLogo} alt="Logo" className="h-9 w-9 flex-shrink-0 object-contain" />
            ) : (
              <img src="/logo.svg" alt="iTrackerX" className="h-8 w-auto flex-shrink-0" />
            )
          ) : (
            <img
              src={logoSrc}
              alt="iTrackerX — Fleet Data Intelligence"
              className="h-10 w-auto flex-shrink-0"
            />
          )}
        </Link>
      </div>

      {/* Search shortcut (only when expanded) */}
      {!collapsed && (
        <div className="px-3 py-3">
          <button
            onClick={onOpenCommand}
            className="flex w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Quick search...</span>
            <kbd className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px]">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {navigationItems.filter((item) => profile?.role ? canAccessRoute(profile.role, item.href) : true).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
              title={collapsed ? item.label : undefined}
            >
              {/* Active indicator pill */}
              {active && (
                <motion.div
                  layoutId="activeNavItem"
                  className="absolute inset-0 rounded-lg bg-blue-600"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}

              <Icon
                className={cn(
                  "relative z-10 h-5 w-5 flex-shrink-0",
                  active ? "text-white" : "text-slate-400 group-hover:text-white"
                )}
              />
              {!collapsed && (
                <span className="relative z-10 truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-slate-700/60 p-2">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  );
}
