"use client";

import { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

interface StatsChartProps {
  title: string;
  children: ReactNode;
}

export function StatsChart({ title, children }: StatsChartProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
