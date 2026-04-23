"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/jobcards": "Job Cards",
  "/customers": "Customers",
  "/customer-onboarding": "Customer Onboarding",
  "/staff": "Staff Performance",
  "/hr": "HR & Leave",
  "/documents": "Documents",
  "/inventory": "Inventory",
  "/finance": "Finance",
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(pathname);
  const notificationCount = 3;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{pageTitle}</h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
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
        <button
          className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {/* User Avatar & Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              AD
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-slate-700">Admin User</p>
              <p className="text-xs text-slate-500">admin@itrackerx.com</p>
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
                onClick={() => {
                  // Logout handler placeholder
                  setShowUserMenu(false);
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
