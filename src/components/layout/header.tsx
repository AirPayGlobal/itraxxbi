"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/session-provider";
import { cn, getInitials } from "@/lib/utils";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/hooks/use-notifications";
import {
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  CheckCheck,
} from "lucide-react";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/jobcards": "Job Cards",
  "/inspections": "Vehicle Inspections",
  "/tickets": "Tickets",
  "/customers": "Customers",
  "/customer-onboarding": "Customer Onboarding",
  "/staff": "Staff Performance",
  "/hr": "HR & Leave",
  "/payslips": "Payslips",
  "/documents": "Documents",
  "/inventory": "Inventory",
  "/finance": "Finance",
  "/sales-pipeline": "Sales Pipeline",
  "/my-portal": "My Portal",
  "/meeting-ai": "Meeting AI",
  "/traxx": "TRAXX AI",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (routeTitles[pathname]) {
    return routeTitles[pathname];
  }

  // Check for nested routes (e.g., /tasks/123)
  const basePath = "/" + pathname.split("/")[1];
  if (routeTitles[basePath]) {
    return routeTitles[basePath];
  }

  return "Dashboard";
}

interface HeaderProps {
  onOpenCommand?: () => void;
}

export function Header({ onOpenCommand }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const pageTitle = getPageTitle(pathname);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifs(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white pl-16 pr-4 lg:px-6">
      {/* Page Title (left padding on mobile clears the floating menu button) */}
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-slate-900 lg:text-xl">
          {pageTitle}
        </h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search / Command Palette trigger */}
        <button
          onClick={onOpenCommand}
          className="relative hidden h-9 w-64 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-3 text-sm text-slate-400 transition-colors hover:border-blue-400 hover:bg-white md:flex"
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-500">
            ⌘K
          </kbd>
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-1 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <p className="text-sm font-semibold text-slate-900">
                  Notifications
                </p>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400">
                    No notifications yet
                  </p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.is_read) markRead.mutate(n.id);
                        if (n.link) {
                          setShowNotifs(false);
                          router.push(n.link);
                        }
                      }}
                      className={cn(
                        "flex w-full items-start gap-2 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                        !n.is_read && "bg-blue-50/40"
                      )}
                    >
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                      )}
                      <div className={cn("min-w-0 flex-1", n.is_read && "pl-4")}>
                        <p className="truncate text-sm font-medium text-slate-800">
                          {n.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {getInitials(profile?.name || "?")}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-slate-700">{profile?.name || "User"}</p>
              <p className="text-xs text-slate-500">{user?.email || ""}</p>
            </div>
            <ChevronDown
              className={cn(
                "hidden h-4 w-4 text-slate-400 transition-transform md:block",
                showUserMenu && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <a
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <User className="h-4 w-4" />
                Profile
              </a>
              <a
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Settings className="h-4 w-4" />
                Settings
              </a>
              <div className="my-1 border-t border-slate-100" />
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                onClick={async () => {
                  setShowUserMenu(false);
                  await signOut();
                }}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
