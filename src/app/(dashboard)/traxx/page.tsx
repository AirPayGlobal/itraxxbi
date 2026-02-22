"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  User,
  Sparkles,
  Lightbulb,
  BarChart3,
  Wrench,
  Users,
  FileText,
  Package,
  DollarSign,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
}

// ---------------------------------------------------------------------------
// Mock AI Responses
// ---------------------------------------------------------------------------

const aiResponses: Record<string, string> = {
  default:
    "I'm TRAXX AI, your intelligent assistant for the ITRACKERX platform. I can help you with job cards, customer management, staff performance, HR, documents, inventory, and finances. What would you like to know?",
  "job cards":
    "**Job Card Summary (February 2026)**\n\nHere's a quick overview of your job card status:\n\n- **Total Active:** 24 job cards\n- **Open:** 8 (awaiting assignment)\n- **Assigned:** 6 (technician allocated)\n- **In Progress:** 5 (work underway)\n- **Completed:** 3 (pending invoicing)\n- **Invoiced:** 2\n\n**Key Insight:** Your open job cards have increased 12% this month. I recommend assigning the 8 open jobs to balance technician workloads — John Mutua currently has the highest capacity with a 92% performance score.\n\n**Action Needed:** JC-2602-0003 (Tracker Repair - Ford Ranger) is marked URGENT and should be prioritized today.",
  "customer":
    "**Customer Analytics**\n\n- **Active Customers:** 156 (+8% MoM)\n- **Total Vehicles Tracked:** 342\n- **Monthly Recurring Revenue:** $28,400\n- **Contract Renewals Due (30 days):** 3\n\n**Top Customers by Revenue:**\n1. TransNamib Holdings — 45 vehicles — $4,200/mo\n2. Ohlthaver & List — 35 vehicles — $3,500/mo\n3. Meat Corp Namibia — 28 vehicles — $2,800/mo\n\n**Churn Risk:** Namdeb Diamond Corp's contract expired in June 2025 and is now inactive. Consider a re-engagement campaign with a special offer.\n\n**Opportunity:** FNB Namibia and Namibia Logistics are prospects — schedule follow-up meetings this week.",
  "staff":
    "**Staff Performance Overview**\n\n**Top Performers (February 2026):**\n1. **John Mutua** — Score: 92% — 28 jobs completed — 4.7★ rating\n2. **Lisa Amupolo** — Score: 90% — Excellent ops management\n3. **Sarah Peters** — Score: 88% — Best customer rating (4.8★)\n\n**Needs Attention:**\n- **David Kapere** (Junior Tech) — Score: 65% ↓ — Avg response time 3.5h is above target. Recommend pairing with John Mutua for mentoring.\n- **Peter Angula** — Score: 74% ↓ — Declining trend, schedule a performance review.\n\n**Recommendation:** Consider redistributing workload — James Shilongo can take 2 more jobs this week based on his current capacity.",
  "finance":
    "**Financial Dashboard — February 2026**\n\n- **Revenue (MTD):** $50,275 (+15% vs Jan)\n- **Outstanding Invoices:** $23,700 across 4 invoices\n- **Total Expenses:** $74,200\n- **Net Profit (MTD):** ~$9,275\n\n**Alerts:**\n- **Overdue:** INV-2602-0003 (Pupkewitz Motors) — $3,220 — 19 days past due. Send a payment reminder immediately.\n- **Partial Payment:** INV-2602-0006 (Bank Windhoek) — $3,680 — Follow up on remaining balance.\n\n**Cost Optimization:** Salary expenses ($45,000) represent 61% of total costs. Equipment purchases ($17,600) are higher than average — bulk purchasing from SinoTrack saved ~12%.",
  "inventory":
    "**Inventory & Asset Summary**\n\n- **Total Assets:** 156 items across 7 categories\n- **GPS Trackers:** 48 in stock (12 assigned this month)\n- **Low Stock Alert:** 3 items below minimum levels:\n  - Wiring Harness Kit — 5 remaining (min: 10)\n  - OBD-II Connectors — 3 remaining (min: 8)\n  - SIM Cards — 12 remaining (min: 20)\n\n**Recommendation:** Place an urgent order for OBD-II connectors and SIM cards to avoid job card delays. Estimated cost: $450 for connectors + $200 for SIM cards.\n\n**Asset Utilization:** 85% of GPS tracker units are deployed. Consider ordering 20 additional units for the upcoming TransNamib fleet expansion.",
  "hr":
    "**HR & Leave Overview — February 2026**\n\n- **Total Employees:** 24\n- **On Leave Today:** 2 (Sarah Peters - Annual, David Kapere - Sick)\n- **Pending Requests:** 3 leave requests awaiting approval\n\n**Leave Balances Alert:**\n- 4 employees have >15 days of unused annual leave. Recommend encouraging leave before Q2.\n- Peter Angula has used 8 of 12 sick days — above average usage.\n\n**Upcoming:**\n- James Shilongo's contract renewal is due March 15\n- Lisa Amupolo's training certification expires April 30\n\n**Recommendation:** Process the 3 pending leave requests to maintain team morale. Approve Sarah Peters' extension and David Kapere's sick leave.",
};

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("job") || lower.includes("card") || lower.includes("work order"))
    return aiResponses["job cards"];
  if (lower.includes("customer") || lower.includes("client") || lower.includes("crm"))
    return aiResponses["customer"];
  if (lower.includes("staff") || lower.includes("performance") || lower.includes("technician") || lower.includes("team"))
    return aiResponses["staff"];
  if (lower.includes("financ") || lower.includes("invoice") || lower.includes("revenue") || lower.includes("expense") || lower.includes("money") || lower.includes("profit"))
    return aiResponses["finance"];
  if (lower.includes("inventor") || lower.includes("asset") || lower.includes("stock") || lower.includes("tracker") || lower.includes("device"))
    return aiResponses["inventory"];
  if (lower.includes("hr") || lower.includes("leave") || lower.includes("employee") || lower.includes("holiday") || lower.includes("sick"))
    return aiResponses["hr"];
  return aiResponses["default"];
}

// ---------------------------------------------------------------------------
// Quick Suggestions
// ---------------------------------------------------------------------------

const quickSuggestions: Suggestion[] = [
  {
    id: "1",
    title: "Job Card Summary",
    description: "Get an overview of all active job cards",
    icon: <Wrench className="h-5 w-5 text-blue-500" />,
    prompt: "Give me a summary of all active job cards this month",
  },
  {
    id: "2",
    title: "Customer Analytics",
    description: "Customer metrics and churn analysis",
    icon: <Users className="h-5 w-5 text-emerald-500" />,
    prompt: "Show me customer analytics and any churn risks",
  },
  {
    id: "3",
    title: "Staff Performance",
    description: "Team performance scores and recommendations",
    icon: <BarChart3 className="h-5 w-5 text-purple-500" />,
    prompt: "How is my team performing this month?",
  },
  {
    id: "4",
    title: "Financial Report",
    description: "Revenue, expenses, and overdue invoices",
    icon: <DollarSign className="h-5 w-5 text-amber-500" />,
    prompt: "Show me the financial report for this month",
  },
  {
    id: "5",
    title: "Inventory Alerts",
    description: "Low stock and asset utilization",
    icon: <Package className="h-5 w-5 text-red-500" />,
    prompt: "Are there any low stock alerts or inventory issues?",
  },
  {
    id: "6",
    title: "HR & Leave Status",
    description: "Leave requests and employee updates",
    icon: <FileText className="h-5 w-5 text-cyan-500" />,
    prompt: "What's the HR and leave status for this month?",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TraxxAIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm **TRAXX AI**, your intelligent business assistant. I can analyze your data across all modules — job cards, customers, staff performance, HR, inventory, and finances.\n\nAsk me anything or tap a suggestion below to get started.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const response = getAIResponse(text);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    sendMessage(suggestion.prompt);
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content.replace(/\*\*/g, ""));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content:
          "Chat reset! I'm ready to help. What would you like to know about your business?",
        timestamp: new Date(),
      },
    ]);
  };

  const renderContent = (content: string) => {
    // Simple markdown-like rendering for bold text and line breaks
    const lines = content.split("\n");
    return lines.map((line, i) => {
      if (line.trim() === "") return <br key={i} />;

      // Parse bold markers
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={j} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      // Detect list items
      if (line.trimStart().startsWith("- ") || line.trimStart().match(/^\d+\./)) {
        return (
          <p key={i} className="ml-2 py-0.5">
            {rendered}
          </p>
        );
      }

      return (
        <p key={i} className="py-0.5">
          {rendered}
        </p>
      );
    });
  };

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-md">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">TRAXX AI</h1>
            <p className="text-xs text-slate-500">
              Intelligent Business Assistant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-green-700">Online</span>
          </div>
          <button
            onClick={handleReset}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Reset conversation"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={cn(
                  "group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 shadow-sm"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="space-y-0">{renderContent(msg.content)}</div>
                ) : (
                  <p>{msg.content}</p>
                )}
                <p
                  className={cn(
                    "mt-2 text-[10px]",
                    msg.role === "user" ? "text-blue-200" : "text-slate-400"
                  )}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {msg.role === "assistant" && msg.id !== "welcome" && msg.id !== "welcome-reset" && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="absolute -right-2 -top-2 hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm transition-colors hover:bg-slate-50 group-hover:block"
                    title="Copy response"
                  >
                    {copiedId === msg.id ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </button>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200">
                  <User className="h-4 w-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Suggestions */}
      {showSuggestions && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
              <Lightbulb className="h-3.5 w-3.5" />
              Quick Suggestions
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="mt-0.5 shrink-0">{suggestion.icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {suggestion.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {suggestion.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-center gap-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask TRAXX AI anything about your business..."
            disabled={isTyping}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-slate-400">
          TRAXX AI uses mock data for demonstration. In production, it connects to your live database.
        </p>
      </div>
    </div>
  );
}
