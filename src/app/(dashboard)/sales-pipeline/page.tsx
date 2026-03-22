"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Plus,
  Search,
  Phone,
  Mail,
  ArrowUpRight,
  GripVertical,
  Building2,
  Clock,
  X,
  Bot,
  Sparkles,
  AlertTriangle,
  Bell,
  Lightbulb,
  CheckCircle2,
  Send,
  RefreshCw,
  Zap,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stage = "lead" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";

interface Deal {
  id: string;
  title: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  value: number;
  probability: number;
  stage: Stage;
  expectedCloseDate: string;
  createdDate: string;
  lastActivity: string;
  notes: string;
  source: string;
}

interface StageConfig {
  id: Stage;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

type InsightType = "reminder" | "suggestion" | "risk" | "opportunity";

interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  dealId: string | null;
  dealTitle: string | null;
  priority: "high" | "medium" | "low";
  actionLabel: string | null;
  dismissed: boolean;
}

const emptyDeal: Omit<Deal, "id" | "createdDate" | "lastActivity"> = {
  title: "",
  company: "",
  contact: "",
  email: "",
  phone: "",
  value: 0,
  probability: 10,
  stage: "lead",
  expectedCloseDate: "",
  notes: "",
  source: "Website",
};

// ---------------------------------------------------------------------------
// Stage Configuration
// ---------------------------------------------------------------------------

const stages: StageConfig[] = [
  { id: "lead", label: "New Lead", color: "text-slate-700", bgColor: "bg-slate-100", borderColor: "border-slate-300" },
  { id: "qualified", label: "Qualified", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-300" },
  { id: "proposal", label: "Proposal", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-300" },
  { id: "negotiation", label: "Negotiation", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-300" },
  { id: "closed_won", label: "Closed Won", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-300" },
  { id: "closed_lost", label: "Closed Lost", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-300" },
];

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockDeals: Deal[] = [
  {
    id: "1",
    title: "Fleet GPS Installation",
    company: "Namibia Breweries Ltd",
    contact: "Johan van der Merwe",
    email: "johan@nbl.com.na",
    phone: "+264 61 320 4999",
    value: 85000,
    probability: 80,
    stage: "negotiation",
    expectedCloseDate: "2026-04-15",
    createdDate: "2026-01-10",
    lastActivity: "2026-03-20",
    notes: "Final pricing discussion scheduled",
    source: "Referral",
  },
  {
    id: "2",
    title: "Vehicle Tracking System",
    company: "MTC Namibia",
    contact: "Sarah Nghikembua",
    email: "sarah@mtc.com.na",
    phone: "+264 61 280 2000",
    value: 120000,
    probability: 60,
    stage: "proposal",
    expectedCloseDate: "2026-05-01",
    createdDate: "2026-02-05",
    lastActivity: "2026-03-18",
    notes: "Technical proposal submitted, awaiting review",
    source: "Website",
  },
  {
    id: "3",
    title: "Dash Cam Upgrade",
    company: "FNB Namibia",
    contact: "Peter Shilongo",
    email: "peter.s@fnbnamibia.com.na",
    phone: "+264 61 299 2111",
    value: 45000,
    probability: 90,
    stage: "closed_won",
    expectedCloseDate: "2026-03-10",
    createdDate: "2025-12-15",
    lastActivity: "2026-03-10",
    notes: "Contract signed, installation scheduled",
    source: "Existing Customer",
  },
  {
    id: "4",
    title: "Asset Tracking Solution",
    company: "Ohlthaver & List",
    contact: "Hans Mueller",
    email: "hans.m@ol.na",
    phone: "+264 61 207 5111",
    value: 200000,
    probability: 30,
    stage: "qualified",
    expectedCloseDate: "2026-06-30",
    createdDate: "2026-03-01",
    lastActivity: "2026-03-19",
    notes: "Initial requirements gathering complete",
    source: "Cold Outreach",
  },
  {
    id: "5",
    title: "Fleet Management Platform",
    company: "Pupkewitz Holdings",
    contact: "Maria Hamutenya",
    email: "maria@pupkewitz.com",
    phone: "+264 61 295 2000",
    value: 175000,
    probability: 20,
    stage: "lead",
    expectedCloseDate: "2026-07-15",
    createdDate: "2026-03-15",
    lastActivity: "2026-03-15",
    notes: "Inbound enquiry from website",
    source: "Website",
  },
  {
    id: "6",
    title: "Driver Behaviour Monitoring",
    company: "TransNamib Holdings",
    contact: "James Katjirua",
    email: "james.k@transnamib.com.na",
    phone: "+264 61 298 2032",
    value: 95000,
    probability: 50,
    stage: "proposal",
    expectedCloseDate: "2026-05-20",
    createdDate: "2026-02-20",
    lastActivity: "2026-03-17",
    notes: "Demo completed, proposal being reviewed",
    source: "Trade Show",
  },
  {
    id: "7",
    title: "Fuel Monitoring System",
    company: "Engen Namibia",
    contact: "Anna Petrus",
    email: "anna.p@engen.com.na",
    phone: "+264 61 290 3000",
    value: 65000,
    probability: 40,
    stage: "qualified",
    expectedCloseDate: "2026-06-01",
    createdDate: "2026-02-28",
    lastActivity: "2026-03-16",
    notes: "Technical evaluation in progress",
    source: "Referral",
  },
  {
    id: "8",
    title: "Cold Storage Fleet Tracking",
    company: "Spar Group Namibia",
    contact: "David Nangolo",
    email: "david.n@spar.com.na",
    phone: "+264 61 275 4100",
    value: 55000,
    probability: 10,
    stage: "lead",
    expectedCloseDate: "2026-08-01",
    createdDate: "2026-03-18",
    lastActivity: "2026-03-18",
    notes: "Initial contact via LinkedIn",
    source: "Social Media",
  },
  {
    id: "9",
    title: "Mine Vehicle Tracking",
    company: "Rössing Uranium",
    contact: "Thomas Angula",
    email: "t.angula@rossing.com",
    phone: "+264 64 520 2111",
    value: 310000,
    probability: 70,
    stage: "negotiation",
    expectedCloseDate: "2026-04-30",
    createdDate: "2026-01-25",
    lastActivity: "2026-03-21",
    notes: "Contract terms under legal review",
    source: "Tender",
  },
  {
    id: "10",
    title: "Delivery Fleet Optimization",
    company: "Woermann Brock",
    contact: "Lisa Amupolo",
    email: "lisa.a@woermannbrock.com",
    phone: "+264 61 371 2000",
    value: 78000,
    probability: 0,
    stage: "closed_lost",
    expectedCloseDate: "2026-03-01",
    createdDate: "2025-11-10",
    lastActivity: "2026-03-01",
    notes: "Lost to competitor on price",
    source: "Website",
  },
  {
    id: "11",
    title: "Construction Equipment Tracking",
    company: "Aveng Namibia",
    contact: "Paul Shikongo",
    email: "paul.s@aveng.com.na",
    phone: "+264 61 235 7000",
    value: 140000,
    probability: 85,
    stage: "closed_won",
    expectedCloseDate: "2026-02-28",
    createdDate: "2025-10-20",
    lastActivity: "2026-02-28",
    notes: "Deployment complete, invoiced",
    source: "Referral",
  },
  {
    id: "12",
    title: "Taxi Fleet Management",
    company: "Windhoek Express Cabs",
    contact: "Grace Iipinge",
    email: "grace@wecabs.com.na",
    phone: "+264 61 255 6000",
    value: 32000,
    probability: 35,
    stage: "qualified",
    expectedCloseDate: "2026-06-15",
    createdDate: "2026-03-10",
    lastActivity: "2026-03-20",
    notes: "Budget approval pending",
    source: "Cold Outreach",
  },
];

// ---------------------------------------------------------------------------
// Chart Data
// ---------------------------------------------------------------------------

const monthlyRevenue = [
  { month: "Oct", won: 42000, lost: 15000 },
  { month: "Nov", won: 58000, lost: 22000 },
  { month: "Dec", won: 35000, lost: 8000 },
  { month: "Jan", won: 72000, lost: 18000 },
  { month: "Feb", won: 140000, lost: 30000 },
  { month: "Mar", won: 85000, lost: 78000 },
];

const sourceData = [
  { name: "Referral", value: 4, color: "#3b82f6" },
  { name: "Website", value: 3, color: "#8b5cf6" },
  { name: "Cold Outreach", value: 2, color: "#f59e0b" },
  { name: "Trade Show", value: 1, color: "#10b981" },
  { name: "Social Media", value: 1, color: "#ef4444" },
  { name: "Tender", value: 1, color: "#06b6d4" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SalesPipelinePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [newDeal, setNewDeal] = useState(emptyDeal);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChatMessages, setAiChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  const filteredDeals = useMemo(() => {
    if (!searchQuery) return deals;
    const q = searchQuery.toLowerCase();
    return deals.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.company.toLowerCase().includes(q) ||
        d.contact.toLowerCase().includes(q)
    );
  }, [deals, searchQuery]);

  const dealsByStage = useMemo(() => {
    const grouped: Record<Stage, Deal[]> = {
      lead: [],
      qualified: [],
      proposal: [],
      negotiation: [],
      closed_won: [],
      closed_lost: [],
    };
    filteredDeals.forEach((d) => grouped[d.stage].push(d));
    return grouped;
  }, [filteredDeals]);

  const metrics = useMemo(() => {
    const activeDeals = deals.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost");
    const wonDeals = deals.filter((d) => d.stage === "closed_won");
    const lostDeals = deals.filter((d) => d.stage === "closed_lost");
    const totalPipeline = activeDeals.reduce((sum, d) => sum + d.value, 0);
    const weightedPipeline = activeDeals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
    const totalWon = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const winRate = wonDeals.length + lostDeals.length > 0
      ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
      : 0;
    return {
      totalPipeline,
      weightedPipeline,
      totalWon,
      winRate,
      activeCount: activeDeals.length,
      avgDealSize: activeDeals.length > 0 ? totalPipeline / activeDeals.length : 0,
    };
  }, [deals]);

  const handleDragStart = (dealId: string) => {
    setDraggedDeal(dealId);
  };

  const handleDragOver = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (stage: Stage) => {
    if (draggedDeal) {
      setDeals((prev) =>
        prev.map((d) => {
          if (d.id !== draggedDeal) return d;
          const probability =
            stage === "closed_won" ? 100 :
            stage === "closed_lost" ? 0 :
            stage === "negotiation" ? 70 :
            stage === "proposal" ? 50 :
            stage === "qualified" ? 30 :
            10;
          return { ...d, stage, probability };
        })
      );
    }
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  const stageTotal = (stage: Stage) =>
    dealsByStage[stage].reduce((sum, d) => sum + d.value, 0);

  const handleAddDeal = () => {
    if (!newDeal.title || !newDeal.company) return;
    const today = new Date().toISOString().split("T")[0];
    const deal: Deal = {
      ...newDeal,
      id: String(Date.now()),
      createdDate: today,
      lastActivity: today,
    };
    setDeals((prev) => [...prev, deal]);
    setNewDeal(emptyDeal);
    setShowAddDeal(false);
  };

  const generateAIInsights = useCallback(() => {
    setAiLoading(true);
    const today = new Date();
    const insights: AIInsight[] = [];

    // Stale deals - no activity in 5+ days
    deals.forEach((d) => {
      if (d.stage === "closed_won" || d.stage === "closed_lost") return;
      const lastAct = new Date(d.lastActivity);
      const daysSince = Math.floor((today.getTime() - lastAct.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 5) {
        insights.push({
          id: `stale-${d.id}`,
          type: "reminder",
          title: "Follow-up overdue",
          description: `No activity on "${d.title}" for ${daysSince} days. ${d.contact} at ${d.company} may lose interest. Consider scheduling a call or sending a check-in email.`,
          dealId: d.id,
          dealTitle: d.title,
          priority: daysSince >= 10 ? "high" : "medium",
          actionLabel: "View Deal",
          dismissed: false,
        });
      }
    });

    // Deals closing soon
    deals.forEach((d) => {
      if (d.stage === "closed_won" || d.stage === "closed_lost") return;
      const closeDate = new Date(d.expectedCloseDate);
      const daysUntil = Math.floor((closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 14 && daysUntil >= 0 && d.stage !== "negotiation") {
        insights.push({
          id: `closing-${d.id}`,
          type: "risk",
          title: "Close date approaching",
          description: `"${d.title}" (${formatCurrency(d.value)}) closes in ${daysUntil} days but is still in ${stages.find((s) => s.id === d.stage)?.label}. Consider accelerating or adjusting the timeline.`,
          dealId: d.id,
          dealTitle: d.title,
          priority: daysUntil <= 7 ? "high" : "medium",
          actionLabel: "View Deal",
          dismissed: false,
        });
      }
    });

    // High-value deals with low probability
    deals.forEach((d) => {
      if (d.stage === "closed_won" || d.stage === "closed_lost") return;
      if (d.value >= 100000 && d.probability <= 30) {
        insights.push({
          id: `highval-${d.id}`,
          type: "opportunity",
          title: "High-value deal needs attention",
          description: `"${d.title}" is worth ${formatCurrency(d.value)} but only has ${d.probability}% probability. Prioritize a discovery call with ${d.contact} to understand blockers and increase confidence.`,
          dealId: d.id,
          dealTitle: d.title,
          priority: "high",
          actionLabel: "View Deal",
          dismissed: false,
        });
      }
    });

    // Suggest upsell for won deals
    const wonDeals = deals.filter((d) => d.stage === "closed_won");
    if (wonDeals.length > 0) {
      const topWon = wonDeals.reduce((a, b) => (a.value > b.value ? a : b));
      insights.push({
        id: `upsell-${topWon.id}`,
        type: "suggestion",
        title: "Upsell opportunity",
        description: `${topWon.company} recently closed "${topWon.title}" for ${formatCurrency(topWon.value)}. Consider reaching out to ${topWon.contact} about complementary services like driver behaviour monitoring or fuel management.`,
        dealId: topWon.id,
        dealTitle: topWon.title,
        priority: "medium",
        actionLabel: "View Deal",
        dismissed: false,
      });
    }

    // Pipeline balance advice
    const leadCount = deals.filter((d) => d.stage === "lead").length;
    const qualifiedCount = deals.filter((d) => d.stage === "qualified").length;
    if (leadCount <= 2) {
      insights.push({
        id: "pipeline-low",
        type: "suggestion",
        title: "Pipeline top is thin",
        description: `Only ${leadCount} deals in the Lead stage. Your pipeline could dry up in 2-3 months. Consider increasing outreach efforts, running a LinkedIn campaign, or attending industry events to generate more leads.`,
        dealId: null,
        dealTitle: null,
        priority: "medium",
        actionLabel: null,
        dismissed: false,
      });
    }

    // Win/loss analysis
    const lostDeals = deals.filter((d) => d.stage === "closed_lost");
    if (lostDeals.length > 0) {
      const lostSources = lostDeals.map((d) => d.source);
      const commonSource = lostSources.sort((a, b) =>
        lostSources.filter((s) => s === b).length - lostSources.filter((s) => s === a).length
      )[0];
      insights.push({
        id: "loss-pattern",
        type: "risk",
        title: "Loss pattern detected",
        description: `Most lost deals came from "${commonSource}" leads. Review your qualification criteria for this channel or adjust messaging to better pre-qualify prospects before investing sales effort.`,
        dealId: null,
        dealTitle: null,
        priority: "low",
        actionLabel: null,
        dismissed: false,
      });
    }

    // Weighted pipeline advice
    if (metrics.weightedPipeline < metrics.totalPipeline * 0.4) {
      insights.push({
        id: "low-confidence",
        type: "risk",
        title: "Low pipeline confidence",
        description: `Your weighted pipeline (${formatCurrency(metrics.weightedPipeline)}) is only ${Math.round((metrics.weightedPipeline / metrics.totalPipeline) * 100)}% of total. Many deals have low probability. Focus on moving qualified deals forward with demos and proposals.`,
        dealId: null,
        dealTitle: null,
        priority: "medium",
        actionLabel: null,
        dismissed: false,
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    setTimeout(() => {
      setAiInsights(insights);
      setAiLoading(false);
    }, 800);
  }, [deals, metrics.weightedPipeline, metrics.totalPipeline]);

  const handleAIChat = () => {
    if (!aiChatInput.trim()) return;
    const question = aiChatInput.trim();
    setAiChatMessages((prev) => [...prev, { role: "user", text: question }]);
    setAiChatInput("");

    const q = question.toLowerCase();
    let response = "";

    if (q.includes("best") && (q.includes("deal") || q.includes("opportunity"))) {
      const best = deals
        .filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost")
        .sort((a, b) => b.value * b.probability - a.value * a.probability)[0];
      response = best
        ? `Your strongest opportunity is "${best.title}" with ${best.company} — ${formatCurrency(best.value)} at ${best.probability}% probability (weighted: ${formatCurrency(best.value * best.probability / 100)}). ${best.stage === "negotiation" ? "It's in negotiation, so focus on closing terms." : `It's in ${stages.find(s => s.id === best.stage)?.label}, consider pushing it to the next stage.`}`
        : "No active deals found.";
    } else if (q.includes("risk") || q.includes("danger") || q.includes("at risk")) {
      const atRisk = deals.filter((d) => {
        if (d.stage === "closed_won" || d.stage === "closed_lost") return false;
        const daysSinceActivity = Math.floor((new Date().getTime() - new Date(d.lastActivity).getTime()) / 86400000);
        return daysSinceActivity > 5 || d.probability < 30;
      });
      response = atRisk.length > 0
        ? `${atRisk.length} deals are at risk:\n${atRisk.map(d => `• "${d.title}" (${d.company}) — ${formatCurrency(d.value)}, ${d.probability}% prob`).join("\n")}\n\nI recommend prioritizing follow-ups on the highest-value deals first.`
        : "No deals currently appear to be at significant risk. Keep up the good work!";
    } else if (q.includes("forecast") || q.includes("revenue") || q.includes("predict")) {
      const active = deals.filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost");
      const weighted = active.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
      const won = deals.filter(d => d.stage === "closed_won").reduce((sum, d) => sum + d.value, 0);
      response = `Based on current pipeline:\n• Already won: ${formatCurrency(won)}\n• Weighted forecast (active deals): ${formatCurrency(weighted)}\n• Best case (all active close): ${formatCurrency(active.reduce((s, d) => s + d.value, 0))}\n\nTo hit higher targets, focus on the ${active.filter(d => d.probability >= 50).length} deals with 50%+ probability — they represent your most likely near-term revenue.`;
    } else if (q.includes("next") && (q.includes("step") || q.includes("action") || q.includes("do"))) {
      const urgentDeals = deals
        .filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost")
        .sort((a, b) => new Date(a.expectedCloseDate).getTime() - new Date(b.expectedCloseDate).getTime())
        .slice(0, 3);
      response = `Here are your top priorities:\n${urgentDeals.map((d, i) => `${i + 1}. "${d.title}" (${d.company}) — ${stages.find(s => s.id === d.stage)?.label}, closes ${formatDate(d.expectedCloseDate)}\n   → ${d.stage === "lead" ? "Qualify the lead: schedule a discovery call" : d.stage === "qualified" ? "Send a tailored proposal" : d.stage === "proposal" ? "Follow up on proposal, address concerns" : "Push for contract signature"}`).join("\n")}`;
    } else if (q.includes("source") || q.includes("channel") || q.includes("where")) {
      const sources: Record<string, { count: number; value: number }> = {};
      deals.forEach(d => {
        if (!sources[d.source]) sources[d.source] = { count: 0, value: 0 };
        sources[d.source].count++;
        sources[d.source].value += d.value;
      });
      const sorted = Object.entries(sources).sort((a, b) => b[1].value - a[1].value);
      response = `Lead source analysis:\n${sorted.map(([source, data]) => `• ${source}: ${data.count} deals, ${formatCurrency(data.value)} total value`).join("\n")}\n\n${sorted[0][0]} generates the most pipeline value. Consider doubling down on this channel.`;
    } else {
      response = `Here's a quick pipeline summary:\n• ${deals.filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost").length} active deals worth ${formatCurrency(metrics.totalPipeline)}\n• Win rate: ${metrics.winRate}%\n• Weighted forecast: ${formatCurrency(metrics.weightedPipeline)}\n\nTry asking me about: "best opportunities", "deals at risk", "revenue forecast", "next actions", or "lead sources".`;
    }

    setTimeout(() => {
      setAiChatMessages((prev) => [...prev, { role: "ai", text: response }]);
    }, 600);
  };

  const dismissInsight = (id: string) => {
    setAiInsights((prev) => prev.map((i) => (i.id === id ? { ...i, dismissed: true } : i)));
  };

  const activeInsights = aiInsights.filter((i) => !i.dismissed);

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Sales Pipeline</h1>
            <p className="text-slate-500 mt-1">Track and manage your deals from lead to close</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors",
                  viewMode === "kanban" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Board
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors",
                  viewMode === "list" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                List
              </button>
            </div>
            <button
              onClick={() => { setShowAIPanel(true); if (aiInsights.length === 0) generateAIInsights(); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-violet-700 hover:to-blue-700 transition-all shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              AI Assistant
              {activeInsights.length > 0 && (
                <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">{activeInsights.length}</span>
              )}
            </button>
            <button
              onClick={() => setShowAddDeal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Deal
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <span className="flex items-center text-sm text-emerald-600 font-medium">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              12%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.totalPipeline)}</p>
          <p className="text-sm text-slate-500 mt-1">Total Pipeline</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <span className="flex items-center text-sm text-emerald-600 font-medium">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              8%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.weightedPipeline)}</p>
          <p className="text-sm text-slate-500 mt-1">Weighted Pipeline</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="flex items-center text-sm text-emerald-600 font-medium">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              24%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.totalWon)}</p>
          <p className="text-sm text-slate-500 mt-1">Revenue Won</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-sm text-slate-500 font-medium">
              {metrics.activeCount} active
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.winRate}%</p>
          <p className="text-sm text-slate-500 mt-1">Win Rate</p>
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === "kanban" && (
        <div className="mb-8 overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => (
              <div
                key={stage.id}
                className={cn(
                  "w-72 flex-shrink-0 rounded-xl border-2 transition-colors",
                  dragOverStage === stage.id ? "border-blue-400 bg-blue-50/50" : "border-transparent bg-slate-100/50"
                )}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(stage.id)}
              >
                {/* Stage Header */}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", stage.color)}>
                      {stage.label}
                    </span>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      stage.bgColor, stage.color
                    )}>
                      {dealsByStage[stage.id].length}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {formatCurrency(stageTotal(stage.id))}
                  </span>
                </div>

                {/* Deal Cards */}
                <div className="px-2 pb-3 space-y-2 min-h-[120px]">
                  {dealsByStage[stage.id].map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={() => handleDragStart(deal.id)}
                      onClick={() => setSelectedDeal(deal)}
                      className={cn(
                        "bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md transition-all hover:border-blue-200",
                        draggedDeal === deal.id && "opacity-50 scale-95"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-slate-900 line-clamp-1">{deal.title}</h4>
                        <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs text-slate-600 truncate">{deal.company}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatCurrency(deal.value)}
                        </span>
                        <span className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded",
                          deal.probability >= 70 ? "bg-emerald-100 text-emerald-700" :
                          deal.probability >= 40 ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {deal.probability}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-400">
                          Close {formatDate(deal.expectedCloseDate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Deal</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Company</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Value</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Stage</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Probability</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Expected Close</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDeals.map((deal) => {
                  const stageConfig = stages.find((s) => s.id === deal.stage)!;
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => setSelectedDeal(deal)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900">{deal.title}</p>
                        <p className="text-xs text-slate-500">{deal.contact}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{deal.company}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatCurrency(deal.value)}</td>
                      <td className="px-6 py-4">
                        <span className={cn("text-xs font-medium px-2 py-1 rounded-full", stageConfig.bgColor, stageConfig.color)}>
                          {stageConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                deal.probability >= 70 ? "bg-emerald-500" :
                                deal.probability >= 40 ? "bg-amber-500" :
                                "bg-slate-400"
                              )}
                              style={{ width: `${deal.probability}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600">{deal.probability}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(deal.expectedCloseDate)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{deal.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue Won vs Lost</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
              />
              <Bar dataKey="won" name="Won" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lost" name="Lost" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Deals by Source</h3>
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={280}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {sourceData.map((source) => (
                <div key={source.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                  <span className="text-sm text-slate-600">{source.name}</span>
                  <span className="text-sm font-medium text-slate-900 ml-auto">{source.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Deal Detail Slide-over */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedDeal(null)} />
          <div className="relative bg-white w-full max-w-md shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Deal Details</h2>
              <button
                onClick={() => setSelectedDeal(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedDeal.title}</h3>
                <p className="text-sm text-slate-500 mt-1">Created {formatDate(selectedDeal.createdDate)}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-900">{formatCurrency(selectedDeal.value)}</span>
                <span className={cn(
                  "text-sm font-medium px-2 py-1 rounded-full",
                  stages.find((s) => s.id === selectedDeal.stage)!.bgColor,
                  stages.find((s) => s.id === selectedDeal.stage)!.color
                )}>
                  {stages.find((s) => s.id === selectedDeal.stage)!.label}
                </span>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Contact</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{selectedDeal.company}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{selectedDeal.contact}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-blue-600">{selectedDeal.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{selectedDeal.phone}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Probability</p>
                    <p className="text-lg font-bold text-slate-900">{selectedDeal.probability}%</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Weighted Value</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(selectedDeal.value * (selectedDeal.probability / 100))}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Expected Close</p>
                    <p className="text-sm font-semibold text-slate-900">{formatDate(selectedDeal.expectedCloseDate)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Source</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedDeal.source}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Notes</h4>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selectedDeal.notes}</p>
              </div>

              <div className="text-xs text-slate-400">
                Last activity: {formatDate(selectedDeal.lastActivity)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Deal Modal */}
      {showAddDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddDeal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-900">Add New Deal</h2>
              <button onClick={() => setShowAddDeal(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deal Title *</label>
                <input
                  type="text"
                  value={newDeal.title}
                  onChange={(e) => setNewDeal((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Fleet GPS Installation"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
                  <input
                    type="text"
                    value={newDeal.company}
                    onChange={(e) => setNewDeal((p) => ({ ...p, company: e.target.value }))}
                    placeholder="Company name"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newDeal.contact}
                    onChange={(e) => setNewDeal((p) => ({ ...p, contact: e.target.value }))}
                    placeholder="Full name"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newDeal.email}
                    onChange={(e) => setNewDeal((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@company.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newDeal.phone}
                    onChange={(e) => setNewDeal((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+264 61 ..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deal Value (USD)</label>
                  <input
                    type="number"
                    value={newDeal.value || ""}
                    onChange={(e) => setNewDeal((p) => ({ ...p, value: Number(e.target.value) }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={newDeal.expectedCloseDate}
                    onChange={(e) => setNewDeal((p) => ({ ...p, expectedCloseDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stage</label>
                  <select
                    value={newDeal.stage}
                    onChange={(e) => setNewDeal((p) => ({ ...p, stage: e.target.value as Stage }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {stages.filter((s) => s.id !== "closed_won" && s.id !== "closed_lost").map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
                  <select
                    value={newDeal.source}
                    onChange={(e) => setNewDeal((p) => ({ ...p, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {["Website", "Referral", "Cold Outreach", "Trade Show", "Social Media", "Tender", "Existing Customer"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={newDeal.notes}
                  onChange={(e) => setNewDeal((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Any relevant details about this deal..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddDeal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDeal}
                  disabled={!newDeal.title || !newDeal.company}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Deal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Sales Assistant Panel */}
      {showAIPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAIPanel(false)} />
          <div className="relative bg-white w-full max-w-lg shadow-xl flex flex-col h-full">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">AI Sales Assistant</h2>
                  <p className="text-xs text-white/70">Insights, reminders & suggestions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateAIInsights}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Refresh insights"
                >
                  <RefreshCw className={cn("h-4 w-4 text-white", aiLoading && "animate-spin")} />
                </button>
                <button
                  onClick={() => setShowAIPanel(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Insights Section */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Smart Insights</h3>
                  <span className="text-xs text-slate-500">({activeInsights.length})</span>
                </div>

                {aiLoading && (
                  <div className="flex items-center gap-3 p-4">
                    <div className="animate-spin h-5 w-5 border-2 border-violet-600 border-t-transparent rounded-full" />
                    <span className="text-sm text-slate-500">Analyzing your pipeline...</span>
                  </div>
                )}

                {!aiLoading && activeInsights.length === 0 && aiInsights.length > 0 && (
                  <p className="text-sm text-slate-500 p-3">All insights dismissed. Click refresh for new analysis.</p>
                )}

                {!aiLoading && aiInsights.length === 0 && (
                  <p className="text-sm text-slate-500 p-3">Click refresh to generate AI insights about your pipeline.</p>
                )}

                <div className="space-y-2">
                  {activeInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className={cn(
                        "rounded-lg border p-3",
                        insight.type === "reminder" && "bg-blue-50 border-blue-200",
                        insight.type === "risk" && "bg-red-50 border-red-200",
                        insight.type === "suggestion" && "bg-emerald-50 border-emerald-200",
                        insight.type === "opportunity" && "bg-amber-50 border-amber-200"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {insight.type === "reminder" && <Bell className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />}
                          {insight.type === "risk" && <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />}
                          {insight.type === "suggestion" && <Lightbulb className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />}
                          {insight.type === "opportunity" && <Target className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-slate-900">{insight.title}</h4>
                              {insight.priority === "high" && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 uppercase">Urgent</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{insight.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {insight.actionLabel && insight.dealId && (
                                <button
                                  onClick={() => {
                                    const deal = deals.find((d) => d.id === insight.dealId);
                                    if (deal) { setSelectedDeal(deal); setShowAIPanel(false); }
                                  }}
                                  className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  {insight.actionLabel} &rarr;
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => dismissInsight(insight.id)}
                          className="p-1 hover:bg-white/50 rounded transition-colors flex-shrink-0"
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Pipeline Health</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Avg. Deal Size</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(metrics.avgDealSize)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Pipeline Coverage</p>
                    <p className="text-lg font-bold text-slate-900">
                      {metrics.totalWon > 0 ? `${(metrics.totalPipeline / metrics.totalWon).toFixed(1)}x` : "N/A"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Deals to Follow Up</p>
                    <p className="text-lg font-bold text-slate-900">
                      {deals.filter((d) => {
                        if (d.stage === "closed_won" || d.stage === "closed_lost") return false;
                        return Math.floor((new Date().getTime() - new Date(d.lastActivity).getTime()) / 86400000) >= 3;
                      }).length}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Closing This Month</p>
                    <p className="text-lg font-bold text-slate-900">
                      {deals.filter((d) => {
                        if (d.stage === "closed_won" || d.stage === "closed_lost") return false;
                        const close = new Date(d.expectedCloseDate);
                        const now = new Date();
                        return close.getMonth() === now.getMonth() && close.getFullYear() === now.getFullYear();
                      }).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Chat */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Ask the AI</h3>
                </div>

                <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
                  {aiChatMessages.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">Try asking:</p>
                      {[
                        "What are my best opportunities?",
                        "Which deals are at risk?",
                        "Give me a revenue forecast",
                        "What should I do next?",
                        "Analyze my lead sources",
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => { setAiChatInput(q); }}
                          className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-2 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                  {aiChatMessages.map((msg, idx) => (
                    <div key={idx} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700"
                      )}>
                        <p className="whitespace-pre-line">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={aiChatInput}
                    onChange={(e) => setAiChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAIChat()}
                    placeholder="Ask about your pipeline..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    onClick={handleAIChat}
                    disabled={!aiChatInput.trim()}
                    className="p-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
