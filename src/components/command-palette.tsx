"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
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
  Ticket,
  Receipt,
  UserCircle,
  MessageSquare,
  Funnel,
  UserCheck,
  FolderKanban,
} from "lucide-react";

const pages = [
  { label: "Dashboard", href: "/", icon: Home, group: "Navigation" },
  { label: "Projects", href: "/projects", icon: FolderKanban, group: "Navigation" },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, group: "Navigation" },
  { label: "Job Cards", href: "/jobcards", icon: Wrench, group: "Navigation" },
  { label: "Tickets", href: "/tickets", icon: Ticket, group: "Navigation" },
  { label: "Customers", href: "/customers", icon: Users, group: "Navigation" },
  { label: "Onboarding", href: "/customer-onboarding", icon: UserCheck, group: "Navigation" },
  { label: "Staff Performance", href: "/staff", icon: BarChart, group: "Navigation" },
  { label: "HR & Leave", href: "/hr", icon: Calendar, group: "Navigation" },
  { label: "Payslips", href: "/payslips", icon: Receipt, group: "Navigation" },
  { label: "Documents", href: "/documents", icon: FileText, group: "Navigation" },
  { label: "Inventory", href: "/inventory", icon: Package, group: "Navigation" },
  { label: "Finance", href: "/finance", icon: DollarSign, group: "Navigation" },
  { label: "Sales Pipeline", href: "/sales-pipeline", icon: Funnel, group: "Navigation" },
  { label: "My Portal", href: "/my-portal", icon: UserCircle, group: "Navigation" },
  { label: "Meeting AI", href: "/meeting-ai", icon: MessageSquare, group: "Navigation" },
  { label: "TRAXX AI", href: "/traxx", icon: Bot, group: "Navigation" },
  { label: "Settings", href: "/settings", icon: Settings, group: "Settings" },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function navigate(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  const navItems = pages.filter((p) => p.group === "Navigation");
  const settingsItems = pages.filter((p) => p.group === "Settings");

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-24 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Command className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400">
              <div className="flex items-center border-b border-slate-200 px-4">
                <CommandInput
                  placeholder="Search pages, actions..."
                  value={query}
                  onValueChange={setQuery}
                  className="flex h-12 w-full bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <kbd className="hidden rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline-flex">
                  ESC
                </kbd>
              </div>
              <CommandList className="max-h-80 overflow-y-auto p-2">
                <CommandEmpty className="py-8 text-center text-sm text-slate-500">
                  No results found.
                </CommandEmpty>

                <CommandGroup heading="Navigation">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem
                        key={item.href}
                        value={item.label}
                        onSelect={() => navigate(item.href)}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 aria-selected:bg-blue-50 aria-selected:text-blue-700"
                      >
                        <Icon className="h-4 w-4 text-slate-400" />
                        <span>{item.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>

                <CommandSeparator className="my-1 h-px bg-slate-100" />

                <CommandGroup heading="Settings">
                  {settingsItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem
                        key={item.href}
                        value={item.label}
                        onSelect={() => navigate(item.href)}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 aria-selected:bg-blue-50 aria-selected:text-blue-700"
                      >
                        <Icon className="h-4 w-4 text-slate-400" />
                        <span>{item.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>

              <div className="border-t border-slate-100 px-4 py-2">
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5">↑</kbd>
                    <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5">↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5">↵</kbd>
                    select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5">ESC</kbd>
                    close
                  </span>
                </div>
              </div>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
