"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

const navigationItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Job Cards", href: "/jobcards", icon: Wrench },
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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-slate-900 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand / Logo */}
      <div className={cn("flex items-center border-b border-slate-700/60", collapsed ? "h-16 justify-center px-2" : "h-20 px-4")}>
        <Link href="/" className="flex items-center overflow-hidden">
          {collapsed ? (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-500/30">
              <span className="text-sm font-bold text-white">IX</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center">
                <span className="text-xl font-bold tracking-wide">
                  <span className="text-blue-400">I</span>
                  <span className="text-slate-200">TRACKER</span>
                  <span className="text-blue-400">X</span>
                </span>
                {/* Signal waves */}
                <svg width="22" height="20" viewBox="0 0 22 20" fill="none" className="-ml-0.5 -mt-1 flex-shrink-0">
                  <path d="M4 16 C8 10, 14 10, 18 16" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  <path d="M6.5 12 C9 8, 13 8, 15.5 12" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  <path d="M9 9 C10 7, 12 7, 13 9" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                </svg>
                <span className="ml-1 text-[9px] font-normal text-slate-500 align-super">TM</span>
              </div>
              <span className="text-[9px] font-medium tracking-[0.25em] text-slate-500">
                FLEET DATA INTELLIGENCE
              </span>
            </div>
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
        {navigationItems.map((item) => {
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
