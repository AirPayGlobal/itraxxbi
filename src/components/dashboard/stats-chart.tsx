"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer } from "recharts";

interface StatsChartProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  index?: number;
}

export function StatsChart({ title, subtitle, children, index = 0 }: StatsChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.32 + index * 0.08, ease: "easeOut" }}
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={280}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
