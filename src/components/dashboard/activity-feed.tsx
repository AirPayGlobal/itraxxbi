"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  Wrench,
  CheckSquare,
  UserPlus,
  FileText,
  CalendarCheck,
  Package,
} from "lucide-react";

interface Activity {
  id: string;
  type: "job" | "task" | "customer" | "invoice" | "leave" | "inventory";
  description: string;
}

const activityConfig: Record<
  Activity["type"],
  { icon: React.ElementType; bgColor: string; iconColor: string }
> = {
  job: {
    icon: Wrench,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  task: {
    icon: CheckSquare,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  customer: {
    icon: UserPlus,
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
  invoice: {
    icon: FileText,
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  leave: {
    icon: CalendarCheck,
    bgColor: "bg-teal-50",
    iconColor: "text-teal-600",
  },
  inventory: {
    icon: Package,
    bgColor: "bg-orange-50",
    iconColor: "text-orange-600",
  },
};

const label = (s: string) => s.replace(/_/g, " ").toLowerCase();

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-NA", { day: "numeric", month: "short", year: "numeric" });
}

/** The latest changes across the main tables. Row-level security decides what each person sees. */
function useRecentActivity() {
  return useQuery({
    queryKey: ["recent-activity"],
    queryFn: async (): Promise<(Activity & { at: string })[]> => {
      const db = createClient();
      const recent = { ascending: false } as const;
      const [jobs, tasks, customers, invoices, leave, assets] = await Promise.all([
        db.from("job_cards").select("id, job_number, title, status, updated_at").order("updated_at", recent).limit(5),
        db.from("tasks").select("id, title, status, updated_at").order("updated_at", recent).limit(5),
        db.from("customers").select("id, name, status, created_at, updated_at").order("updated_at", recent).limit(5),
        db.from("invoices").select("id, invoice_number, status, updated_at").order("updated_at", recent).limit(5),
        db.from("leave_requests").select("id, leave_type, status, updated_at").order("updated_at", recent).limit(5),
        db.from("assets").select("id, name, status, updated_at").order("updated_at", recent).limit(5),
      ]);
      const items: (Activity & { at: string })[] = [];
      for (const j of jobs.data ?? [])
        items.push({ id: `job-${j.id}`, type: "job", at: j.updated_at, description: `Job ${j.job_number} (${j.title}) is ${label(j.status)}` });
      for (const t of tasks.data ?? [])
        items.push({ id: `task-${t.id}`, type: "task", at: t.updated_at, description: `Task "${t.title}" is ${label(t.status)}` });
      for (const c of customers.data ?? [])
        items.push({
          id: `cust-${c.id}`,
          type: "customer",
          at: c.updated_at,
          description: c.created_at === c.updated_at ? `New customer: ${c.name}` : `Customer ${c.name} updated (${label(c.status)})`,
        });
      for (const inv of invoices.data ?? [])
        items.push({ id: `inv-${inv.id}`, type: "invoice", at: inv.updated_at, description: `Invoice ${inv.invoice_number} is ${label(inv.status)}` });
      for (const l of leave.data ?? [])
        items.push({ id: `leave-${l.id}`, type: "leave", at: l.updated_at, description: `${label(l.leave_type)} leave request ${label(l.status)}` });
      for (const a of assets.data ?? [])
        items.push({ id: `asset-${a.id}`, type: "inventory", at: a.updated_at, description: `Asset ${a.name} is ${label(a.status)}` });
      return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
    },
  });
}

export function ActivityFeed() {
  const { data: activities = [], isLoading, isError } = useRecentActivity();

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Recent Activity
        </h3>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : isError ? (
        <p className="px-6 py-10 text-center text-sm text-red-600">Couldn&apos;t load recent activity.</p>
      ) : activities.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm italic text-slate-400">No activity yet.</p>
      ) : (
      <div className="divide-y divide-slate-100">
        {activities.map((activity) => {
          const config = activityConfig[activity.type];
          const Icon = config.icon;

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 px-6 py-3.5"
            >
              <div
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  config.bgColor
                )}
              >
                <Icon className={cn("h-4 w-4", config.iconColor)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">{activity.description}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {timeAgo(activity.at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
