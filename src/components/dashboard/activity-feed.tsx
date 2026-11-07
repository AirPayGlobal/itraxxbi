"use client";

import { cn } from "@/lib/utils";
import { Wrench, CheckSquare, UserPlus, FileText } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard";

type Activity = DashboardData["activity"][number];

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
};

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Recent Activity
        </h3>
      </div>
      <div className="divide-y divide-slate-100">
        {activities.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-slate-400">No activity yet</p>
        )}
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
