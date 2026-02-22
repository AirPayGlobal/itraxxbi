"use client";

import { cn } from "@/lib/utils";
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
  timestamp: string;
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

const mockActivities: Activity[] = [
  {
    id: "1",
    type: "job",
    description: "Job card JC-2601-0042 completed by Mike Torres",
    timestamp: "10 minutes ago",
  },
  {
    id: "2",
    type: "task",
    description: "Task 'Inspect cooling system' assigned to Sarah Lee",
    timestamp: "25 minutes ago",
  },
  {
    id: "3",
    type: "customer",
    description: "New customer Acme Industries added by John Davis",
    timestamp: "1 hour ago",
  },
  {
    id: "4",
    type: "invoice",
    description: "Invoice INV-2601-0118 sent to Bright Solutions",
    timestamp: "2 hours ago",
  },
  {
    id: "5",
    type: "leave",
    description: "Leave request approved for Emily Carter (Feb 24-26)",
    timestamp: "3 hours ago",
  },
  {
    id: "6",
    type: "inventory",
    description: "Oil filter stock replenished - 50 units received",
    timestamp: "4 hours ago",
  },
  {
    id: "7",
    type: "job",
    description: "Job card JC-2601-0039 assigned to David Kim",
    timestamp: "5 hours ago",
  },
  {
    id: "8",
    type: "task",
    description: "Task 'Update customer records' marked as complete",
    timestamp: "6 hours ago",
  },
];

export function ActivityFeed() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Recent Activity
        </h3>
      </div>
      <div className="divide-y divide-slate-100">
        {mockActivities.map((activity) => {
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
                  {activity.timestamp}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
