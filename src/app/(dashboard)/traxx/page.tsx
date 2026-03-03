"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  CalendarCheck,
  Bell,
  ListTodo,
  Clock,
  AlertTriangle,
  Zap,
  Target,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  CircleCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

interface ScheduledTask {
  id: string;
  title: string;
  dueDate: Date;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "done";
  createdAt: Date;
}

interface Reminder {
  id: string;
  text: string;
  type: "warning" | "info" | "urgent";
  icon: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatTaskDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parsePriorityFromText(text: string): ScheduledTask["priority"] {
  const lower = text.toLowerCase();
  if (lower.includes("urgent") || lower.includes("asap")) return "urgent";
  if (lower.includes("high") || lower.includes("important")) return "high";
  if (lower.includes("low") || lower.includes("whenever")) return "low";
  return "medium";
}

function parseTaskTitle(text: string): string {
  const lower = text.toLowerCase();
  let title = text;

  const prefixes = [
    "schedule a task",
    "schedule task",
    "remind me to",
    "remind me",
    "set a reminder to",
    "set reminder to",
    "set a reminder",
    "set reminder",
    "plan to",
    "i need to",
    "add task",
    "add a task",
    "create task",
    "create a task",
  ];

  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) {
      title = text.slice(prefix.length).trim();
      break;
    }
    if (lower.includes(prefix)) {
      const idx = lower.indexOf(prefix);
      title = text.slice(idx + prefix.length).trim();
      break;
    }
  }

  // Clean up leading articles or filler
  title = title.replace(/^(to |for |about |that )/i, "");

  if (title.length === 0) title = "New task";

  // Capitalize first letter
  return title.charAt(0).toUpperCase() + title.slice(1);
}

// ---------------------------------------------------------------------------
// Default Reminders
// ---------------------------------------------------------------------------

function getDefaultReminders(): Reminder[] {
  return [
    {
      id: "rem-1",
      text: "3 overdue job cards need attention",
      type: "urgent",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
    {
      id: "rem-2",
      text: "5 support tickets awaiting response",
      type: "warning",
      icon: <Clock className="h-3.5 w-3.5" />,
    },
    {
      id: "rem-3",
      text: "2 leave requests pending approval",
      type: "info",
      icon: <Bell className="h-3.5 w-3.5" />,
    },
  ];
}

// ---------------------------------------------------------------------------
// Mock AI Responses (extended)
// ---------------------------------------------------------------------------

const aiResponses: Record<string, string> = {
  default:
    "I'm TRAXX AI, your intelligent assistant for the ITRACKERX platform. I can help you with job cards, customer management, staff performance, HR, documents, inventory, finances, task scheduling, and more. What would you like to know?",
  "job cards":
    "**Job Card Summary (February 2026)**\n\nHere's a quick overview of your job card status:\n\n- **Total Active:** 24 job cards\n- **Open:** 8 (awaiting assignment)\n- **Assigned:** 6 (technician allocated)\n- **In Progress:** 5 (work underway)\n- **Completed:** 3 (pending invoicing)\n- **Invoiced:** 2\n\n**Key Insight:** Your open job cards have increased 12% this month. I recommend assigning the 8 open jobs to balance technician workloads — John Mutua currently has the highest capacity with a 92% performance score.\n\n**Action Needed:** JC-2602-0003 (Tracker Repair - Ford Ranger) is marked URGENT and should be prioritized today.",
  customer:
    "**Customer Analytics**\n\n- **Active Customers:** 156 (+8% MoM)\n- **Total Vehicles Tracked:** 342\n- **Monthly Recurring Revenue:** $28,400\n- **Contract Renewals Due (30 days):** 3\n\n**Top Customers by Revenue:**\n1. TransNamib Holdings — 45 vehicles — $4,200/mo\n2. Ohlthaver & List — 35 vehicles — $3,500/mo\n3. Meat Corp Namibia — 28 vehicles — $2,800/mo\n\n**Churn Risk:** Namdeb Diamond Corp's contract expired in June 2025 and is now inactive. Consider a re-engagement campaign with a special offer.\n\n**Opportunity:** FNB Namibia and Namibia Logistics are prospects — schedule follow-up meetings this week.",
  staff:
    "**Staff Performance Overview**\n\n**Top Performers (February 2026):**\n1. **John Mutua** — Score: 92% — 28 jobs completed — 4.7 rating\n2. **Lisa Amupolo** — Score: 90% — Excellent ops management\n3. **Sarah Peters** — Score: 88% — Best customer rating (4.8)\n\n**Needs Attention:**\n- **David Kapere** (Junior Tech) — Score: 65% — Avg response time 3.5h is above target. Recommend pairing with John Mutua for mentoring.\n- **Peter Angula** — Score: 74% — Declining trend, schedule a performance review.\n\n**Recommendation:** Consider redistributing workload — James Shilongo can take 2 more jobs this week based on his current capacity.",
  finance:
    "**Financial Dashboard — February 2026**\n\n- **Revenue (MTD):** $50,275 (+15% vs Jan)\n- **Outstanding Invoices:** $23,700 across 4 invoices\n- **Total Expenses:** $74,200\n- **Net Profit (MTD):** ~$9,275\n\n**Alerts:**\n- **Overdue:** INV-2602-0003 (Pupkewitz Motors) — $3,220 — 19 days past due. Send a payment reminder immediately.\n- **Partial Payment:** INV-2602-0006 (Bank Windhoek) — $3,680 — Follow up on remaining balance.\n\n**Cost Optimization:** Salary expenses ($45,000) represent 61% of total costs. Equipment purchases ($17,600) are higher than average — bulk purchasing from SinoTrack saved ~12%.",
  inventory:
    "**Inventory & Asset Summary**\n\n- **Total Assets:** 156 items across 7 categories\n- **GPS Trackers:** 48 in stock (12 assigned this month)\n- **Low Stock Alert:** 3 items below minimum levels:\n  - Wiring Harness Kit — 5 remaining (min: 10)\n  - OBD-II Connectors — 3 remaining (min: 8)\n  - SIM Cards — 12 remaining (min: 20)\n\n**Recommendation:** Place an urgent order for OBD-II connectors and SIM cards to avoid job card delays. Estimated cost: $450 for connectors + $200 for SIM cards.\n\n**Asset Utilization:** 85% of GPS tracker units are deployed. Consider ordering 20 additional units for the upcoming TransNamib fleet expansion.",
  hr:
    "**HR & Leave Overview — February 2026**\n\n- **Total Employees:** 24\n- **On Leave Today:** 2 (Sarah Peters - Annual, David Kapere - Sick)\n- **Pending Requests:** 3 leave requests awaiting approval\n\n**Leave Balances Alert:**\n- 4 employees have >15 days of unused annual leave. Recommend encouraging leave before Q2.\n- Peter Angula has used 8 of 12 sick days — above average usage.\n\n**Upcoming:**\n- James Shilongo's contract renewal is due March 15\n- Lisa Amupolo's training certification expires April 30\n\n**Recommendation:** Process the 3 pending leave requests to maintain team morale. Approve Sarah Peters' extension and David Kapere's sick leave.",
  ticket:
    "**Support Ticket Analytics**\n\nJohannes, here's your current support landscape:\n\n- **Open Tickets:** 12 (5 high priority)\n- **Avg Resolution Time:** 4.2 hours (target: 3h)\n- **SLA Compliance:** 87% (down from 92% last month)\n- **Unassigned:** 3 tickets waiting for triage\n\n**Critical Tickets:**\n1. TKT-0045 — GPS signal loss on TransNamib fleet — **HIGH** — Open 6h\n2. TKT-0048 — Billing discrepancy for O&L — **HIGH** — Open 3h\n3. TKT-0051 — New installation request — **MEDIUM** — Open 1h\n\n**Recommendation:** Assign TKT-0045 to John Mutua immediately — he resolved a similar GPS issue last week in 2 hours. For the billing ticket, coordinate with Finance to verify INV-2602-0006.",
  payslip:
    "**Payslip & Salary Overview**\n\nJohannes, here's the payroll status:\n\n- **Next Pay Date:** March 25, 2026\n- **Payroll Status:** Processing (deadline March 20)\n- **Total Monthly Payroll:** $45,000\n- **Pending Adjustments:** 2 overtime claims, 1 bonus approval\n\n**Your Payslip (Feb 2026):**\n- Basic Salary: $8,500\n- Allowances: $1,200\n- Deductions: $1,850 (Tax: $1,200, Pension: $425, Medical: $225)\n- **Net Pay: $7,850**\n\n**Action Items:**\n- Approve David Kapere's overtime claim ($320) before March 10\n- Lisa Amupolo's performance bonus ($500) pending your sign-off\n- Review tax certificates for year-end submission due April 30",
  agenda:
    "**Your Agenda for Today**\n\nJohannes, here's what's on your plate:\n\n**Morning:**\n- 08:30 — Team standup meeting (15 min)\n- 09:00 — Review 3 pending leave requests\n- 10:00 — TransNamib fleet review call\n\n**Afternoon:**\n- 13:00 — Interview: Junior Technician candidate\n- 14:30 — Finance review with Lisa Amupolo\n- 15:30 — Approve pending invoices (3 items)\n\n**Pending Tasks:**\n- Assign 8 open job cards to available technicians\n- Follow up on overdue invoice INV-2602-0003\n- Review David Kapere's performance improvement plan\n\n**Priority Recommendation:** Start with the TransNamib call prep — they represent $4,200/mo in revenue and have a fleet expansion request pending.",
  help:
    "**TRAXX AI Capabilities**\n\nJohannes, here's everything I can help you with:\n\n**Data & Analytics:**\n- Job card summaries and status tracking\n- Customer analytics and churn predictions\n- Staff performance scores and recommendations\n- Financial reports, invoices, and profit analysis\n- Inventory levels and reorder alerts\n- HR, leave management, and employee insights\n\n**Task Management:**\n- Schedule tasks and set reminders (say \"schedule a task\" or \"remind me to\")\n- View your daily agenda and priorities\n- Track deadlines and follow-ups\n\n**Support & Operations:**\n- Support ticket analytics and SLA tracking\n- Payslip and salary information\n- Generate reports on demand\n\n**Quick Tips:**\n- Ask \"what's my agenda today\" for a daily briefing\n- Say \"remind me to follow up with TransNamib\" to create a task\n- Ask about any module by name: job cards, customers, staff, HR, finance, inventory\n\nJust ask naturally — I understand context and follow-up questions!",
};

// ---------------------------------------------------------------------------
// AI Response Engine
// ---------------------------------------------------------------------------

function getAIResponse(
  input: string,
  lastTopic: string | null,
  tasks: ScheduledTask[]
): { response: string; topic: string | null; shouldCreateTask: boolean } {
  const lower = input.toLowerCase();

  // Task creation detection
  const taskTriggers = [
    "schedule a task",
    "schedule task",
    "remind me",
    "set a reminder",
    "set reminder",
    "add task",
    "add a task",
    "create task",
    "create a task",
    "plan to",
  ];
  const isTaskRequest = taskTriggers.some((t) => lower.includes(t));

  if (isTaskRequest) {
    const taskTitle = parseTaskTitle(input);
    const priority = parsePriorityFromText(input);
    const pendingCount = tasks.filter((t) => t.status === "pending").length;
    return {
      response: `**Task Scheduled** \n\nI've created a new task for you, Johannes:\n\n- **Task:** ${taskTitle}\n- **Priority:** ${priority.charAt(0).toUpperCase() + priority.slice(1)}\n- **Status:** Pending\n\nYou now have **${pendingCount + 1} active task${pendingCount === 0 ? "" : "s"}** in your schedule. You can view and manage them in the Tasks panel on the right.\n\n**Tip:** I'll keep track of this for you. Just ask "what are my tasks" anytime to see your list.`,
      topic: "task",
      shouldCreateTask: true,
    };
  }

  // Follow-up / context-aware: "tell me more", "more details", "expand", "elaborate"
  if (
    (lower.includes("tell me more") ||
      lower.includes("more detail") ||
      lower.includes("expand") ||
      lower.includes("elaborate") ||
      lower.includes("go on") ||
      lower.includes("what else")) &&
    lastTopic
  ) {
    const followUpResponses: Record<string, string> = {
      "job cards":
        "**Job Card Deep Dive**\n\nJohannes, here's more detail on the current job card landscape:\n\n**By Technician:**\n- John Mutua: 7 active (2 urgent)\n- Sarah Peters: 5 active (1 urgent)\n- James Shilongo: 4 active (0 urgent)\n- David Kapere: 3 active (1 on hold)\n\n**Aging Analysis:**\n- 0-2 days: 12 jobs (healthy)\n- 3-5 days: 7 jobs (monitor)\n- 5+ days: 5 jobs (needs escalation)\n\n**Revenue Impact:** The 3 completed jobs pending invoicing represent approximately $4,800 in unbilled revenue. I recommend generating invoices today to improve cash flow.\n\n**Trend:** Job card volume is up 18% compared to the same period last year, indicating strong business growth. Consider hiring an additional technician if this trend continues.",
      customer:
        "**Customer Deep Dive**\n\nJohannes, let me expand on the customer data:\n\n**Retention Metrics:**\n- 12-month retention rate: 94% (excellent)\n- Average customer lifetime: 3.2 years\n- NPS Score: 72 (above industry average)\n\n**Segment Breakdown:**\n- Enterprise (50+ vehicles): 4 clients — $12,400/mo\n- Mid-Market (10-49 vehicles): 12 clients — $9,800/mo\n- SMB (1-9 vehicles): 140 clients — $6,200/mo\n\n**Growth Opportunities:**\n1. Upsell dashcam addon to top 10 clients (est. +$3,500/mo)\n2. Fleet management package for TransNamib (+$800/mo)\n3. Re-engage 5 churned clients from 2025 (est. recovery: $2,100/mo)\n\n**Action:** I'd recommend scheduling a quarterly business review with your top 5 clients this month.",
      staff:
        "**Staff Performance Deep Dive**\n\nJohannes, here's the extended analysis:\n\n**Training Status:**\n- 3 employees due for GPS installation certification renewal\n- 2 employees completed advanced diagnostics training in Jan\n- 1 new hire (David Kapere) still in probation period\n\n**Workload Distribution:**\n- Average jobs per technician: 5.2/week\n- Highest: John Mutua at 7.5/week (risk of burnout)\n- Lowest: David Kapere at 2.8/week (capacity available)\n\n**Satisfaction Indicators:**\n- Last pulse survey: 78% satisfaction (up from 72%)\n- Key concern: After-hours callout frequency\n- Positive feedback: New tool allowance policy\n\n**Recommendation:** Reduce John Mutua's load by 2 jobs/week and distribute to David Kapere with mentoring support. This balances the team and accelerates David's development.",
      finance:
        "**Financial Deep Dive**\n\nJohannes, here's the detailed breakdown:\n\n**Revenue by Category:**\n- Installation fees: $18,200 (36%)\n- Monthly subscriptions: $22,400 (45%)\n- Repairs & maintenance: $6,675 (13%)\n- Accessories & add-ons: $3,000 (6%)\n\n**Expense Breakdown:**\n- Salaries & benefits: $45,000 (61%)\n- Equipment & parts: $17,600 (24%)\n- Office & admin: $5,800 (8%)\n- Marketing: $3,200 (4%)\n- Miscellaneous: $2,600 (3%)\n\n**Cash Flow Forecast (March):**\n- Expected inflows: $55,000 (based on pipeline)\n- Expected outflows: $72,000\n- Projected balance: Positive, but tight\n\n**Action:** Collecting the $23,700 in outstanding invoices would significantly improve the March cash position. Prioritize the Pupkewitz Motors overdue invoice.",
      inventory:
        "**Inventory Deep Dive**\n\nJohannes, here's the extended view:\n\n**Stock Movement (Feb):**\n- Items received: 45\n- Items issued: 38\n- Items returned: 3\n- Damaged/written off: 1\n\n**Top Moving Items:**\n1. GT06N GPS Trackers — 12 issued (fast mover)\n2. Wiring Harness Kits — 8 issued (approaching reorder)\n3. SIM Cards — 15 issued (below safety stock)\n\n**Supplier Performance:**\n- SinoTrack (China): Avg lead time 14 days, 98% order accuracy\n- Local Supplier (Windhoek): Avg lead time 2 days, 95% accuracy\n- Amazon/Import: Avg lead time 21 days, 92% accuracy\n\n**Cost Optimization:** Bulk ordering 100 GT06N units from SinoTrack would save 15% ($2,400). Current order cadence is 20 units/month — consider a quarterly bulk order.",
      hr: "**HR Deep Dive**\n\nJohannes, here's the full picture:\n\n**Headcount Summary:**\n- Full-time: 20\n- Part-time: 2\n- Contract: 2\n- Open positions: 1 (Junior Technician)\n\n**Leave Usage (2026 YTD):**\n- Annual leave taken: 42 days total (avg 1.75/employee)\n- Sick leave taken: 18 days (above forecast)\n- Study leave: 3 days\n\n**Compliance Status:**\n- All employment contracts: Current\n- Tax registrations: Current\n- Skills development levy: Paid through Q1\n- Workman's comp: Renewal due April 2026\n\n**Employee Milestones:**\n- John Mutua: 5-year anniversary in March (plan recognition)\n- Lisa Amupolo: Completing MBA in April\n- Sarah Peters: Nominated for industry award\n\n**Recommendation:** Recognize John's 5-year milestone publicly — it boosts retention and morale across the team.",
      ticket:
        "**Support Tickets Deep Dive**\n\nJohannes, here's the extended analysis:\n\n**Ticket Volume Trend:**\n- This week: 18 tickets (up 20%)\n- Last week: 15 tickets\n- Monthly average: 60 tickets\n\n**Category Breakdown:**\n- GPS signal issues: 35%\n- Installation requests: 25%\n- Billing queries: 20%\n- Feature requests: 10%\n- Other: 10%\n\n**SLA Performance:**\n- Critical (1h target): 90% met\n- High (4h target): 85% met\n- Medium (8h target): 92% met\n- Low (24h target): 98% met\n\n**Root Cause:** The spike in GPS signal tickets correlates with the firmware update pushed on Feb 20. Recommend rolling back firmware for affected units and scheduling a patch release.",
      payslip:
        "**Payroll Deep Dive**\n\nJohannes, here's the comprehensive view:\n\n**Payroll Breakdown by Department:**\n- Technical team (8): $28,000\n- Operations (4): $8,500\n- Administration (3): $5,200\n- Management (2): $3,300\n\n**Year-over-Year Comparison:**\n- 2025 avg monthly payroll: $41,200\n- 2026 current: $45,000 (+9.2%)\n- Reason: 2 new hires + annual increases\n\n**Benefits Administration:**\n- Medical aid: 22 of 24 employees enrolled\n- Pension fund: 100% enrolled (mandatory)\n- Group life cover: Active for all permanent staff\n\n**Upcoming Payroll Actions:**\n- Annual salary reviews due in April\n- Bonus calculations for Q1 performance\n- Tax year-end reconciliation by April 30",
      agenda:
        "**Extended Agenda Details**\n\nJohannes, let me add more context to your day:\n\n**TransNamib Call Prep:**\n- They have 45 vehicles, expanding to 60\n- Discuss pricing for additional 15 units\n- Their account manager (Lisa) prepared a proposal\n- Revenue opportunity: +$1,500/mo\n\n**Interview Notes:**\n- Candidate: Michael Haufiku\n- Experience: 3 years vehicle electronics\n- Salary expectation: $3,200/mo (within budget)\n- Key question: Ask about experience with Chinese GPS hardware\n\n**Finance Review Agenda:**\n- Q1 budget vs actual comparison\n- Discuss equipment purchase plan for Q2\n- Review outstanding invoice collection strategy\n- Cash flow forecast for March-April\n\n**End of Day Targets:**\n- All 8 open job cards assigned\n- Invoice sent for 3 completed jobs\n- TransNamib expansion proposal finalized",
      task: "**Task Management Tips**\n\nJohannes, here are some ways to get the most out of task scheduling:\n\n**Creating Tasks:**\n- Say \"remind me to...\" followed by what you need\n- Include priority words like \"urgent\" or \"important\" for automatic priority setting\n- I'll track all your tasks in the panel on the right\n\n**Managing Your Workload:**\n- Review your task list at the start of each day\n- Mark tasks as done when completed\n- I'll remind you about overdue items\n\n**Current Task Stats:**\n- Check the Tasks panel for your active items\n- Use the \"Daily Briefing\" quick action for a full overview\n\n**Pro Tip:** You can ask me \"what are my tasks\" or \"show my schedule\" anytime to get a quick overview of pending items.",
      help: "**More About TRAXX AI**\n\nJohannes, here are some advanced features:\n\n**Natural Language Understanding:**\n- I understand context — ask a follow-up and I'll know what you mean\n- Use casual language, I'll figure out the intent\n\n**Smart Recommendations:**\n- I don't just show data, I provide actionable advice\n- My suggestions are based on patterns in your business data\n\n**Coming Soon:**\n- Automated report generation and email\n- Calendar integration for task scheduling\n- Voice commands support\n- Multi-language support (English, Afrikaans, German)\n\n**Feedback:** If a response isn't helpful, just tell me! I'm continuously learning to serve you better.",
    };
    return {
      response:
        followUpResponses[lastTopic] ||
        "Let me provide more details on that topic. Could you specify which aspect you'd like me to elaborate on?",
      topic: lastTopic,
      shouldCreateTask: false,
    };
  }

  // Task status query
  if (
    lower.includes("my tasks") ||
    lower.includes("my schedule") ||
    lower.includes("show tasks") ||
    lower.includes("what are my tasks") ||
    lower.includes("task list")
  ) {
    const pending = tasks.filter((t) => t.status === "pending");
    if (pending.length === 0) {
      return {
        response:
          "**Your Task List**\n\nJohannes, you currently have no pending tasks. Your schedule is clear!\n\n**Tip:** Say \"remind me to...\" or \"schedule a task\" to add items to your task list. I'll keep track of everything for you.",
        topic: "task",
        shouldCreateTask: false,
      };
    }
    const taskLines = pending
      .map(
        (t, i) =>
          `${i + 1}. **${t.title}** — Priority: ${t.priority} — Due: ${formatTaskDate(t.dueDate)}`
      )
      .join("\n");
    return {
      response: `**Your Pending Tasks (${pending.length})**\n\nJohannes, here's what's on your list:\n\n${taskLines}\n\nYou can manage these tasks in the panel on the right. Mark them as done when completed, or ask me to add more.`,
      topic: "task",
      shouldCreateTask: false,
    };
  }

  // Standard keyword matching (preserved + extended)
  if (
    lower.includes("job") ||
    lower.includes("card") ||
    lower.includes("work order")
  )
    return {
      response: aiResponses["job cards"],
      topic: "job cards",
      shouldCreateTask: false,
    };
  if (
    lower.includes("customer") ||
    lower.includes("client") ||
    lower.includes("crm")
  )
    return {
      response: aiResponses["customer"],
      topic: "customer",
      shouldCreateTask: false,
    };
  if (
    lower.includes("staff") ||
    lower.includes("performance") ||
    lower.includes("technician") ||
    lower.includes("team")
  )
    return {
      response: aiResponses["staff"],
      topic: "staff",
      shouldCreateTask: false,
    };
  if (
    lower.includes("financ") ||
    lower.includes("invoice") ||
    lower.includes("revenue") ||
    lower.includes("expense") ||
    lower.includes("money") ||
    lower.includes("profit")
  )
    return {
      response: aiResponses["finance"],
      topic: "finance",
      shouldCreateTask: false,
    };
  if (
    lower.includes("inventor") ||
    lower.includes("asset") ||
    lower.includes("stock") ||
    lower.includes("tracker") ||
    lower.includes("device")
  )
    return {
      response: aiResponses["inventory"],
      topic: "inventory",
      shouldCreateTask: false,
    };
  if (
    lower.includes("hr") ||
    lower.includes("leave") ||
    lower.includes("employee") ||
    lower.includes("holiday") ||
    lower.includes("sick")
  )
    return {
      response: aiResponses["hr"],
      topic: "hr",
      shouldCreateTask: false,
    };
  if (lower.includes("ticket") || lower.includes("support"))
    return {
      response: aiResponses["ticket"],
      topic: "ticket",
      shouldCreateTask: false,
    };
  if (
    lower.includes("payslip") ||
    lower.includes("salary") ||
    lower.includes("pay")
  )
    return {
      response: aiResponses["payslip"],
      topic: "payslip",
      shouldCreateTask: false,
    };
  if (
    lower.includes("today") ||
    lower.includes("agenda") ||
    lower.includes("briefing") ||
    lower.includes("schedule today") ||
    lower.includes("daily")
  )
    return {
      response: aiResponses["agenda"],
      topic: "agenda",
      shouldCreateTask: false,
    };
  if (
    lower.includes("help") ||
    lower.includes("what can you do") ||
    lower.includes("capabilities") ||
    lower.includes("how do i")
  )
    return {
      response: aiResponses["help"],
      topic: "help",
      shouldCreateTask: false,
    };

  return {
    response: aiResponses["default"],
    topic: null,
    shouldCreateTask: false,
  };
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
// Quick Action Definitions
// ---------------------------------------------------------------------------

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

const quickActions: QuickAction[] = [
  {
    id: "qa-1",
    label: "Schedule Task",
    icon: <CalendarCheck className="h-4 w-4" />,
    prompt: "Schedule a task to review pending job cards by end of day",
  },
  {
    id: "qa-2",
    label: "Set Reminder",
    icon: <Bell className="h-4 w-4" />,
    prompt: "Remind me to follow up on overdue invoices this afternoon",
  },
  {
    id: "qa-3",
    label: "Daily Briefing",
    icon: <Target className="h-4 w-4" />,
    prompt: "What's my agenda for today?",
  },
  {
    id: "qa-4",
    label: "Generate Report",
    icon: <Zap className="h-4 w-4" />,
    prompt: "Show me the financial report for this month",
  },
];

// ---------------------------------------------------------------------------
// Priority Badge Component
// ---------------------------------------------------------------------------

function PriorityBadge({ priority }: { priority: ScheduledTask["priority"] }) {
  const styles: Record<string, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[priority]
      )}
    >
      {priority}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function TraxxAIPage() {
  // --- State ---
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `${getGreeting()}, Johannes! I'm **TRAXX AI**, your intelligent business assistant. I can analyze your data across all modules -- job cards, customers, staff performance, HR, inventory, finances, and more.\n\nI can also schedule tasks, set reminders, and give you a daily briefing. Ask me anything or tap a suggestion below to get started.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastTopic, setLastTopic] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ScheduledTask[]>([
    {
      id: "default-task-1",
      title: "Review pending leave requests",
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
      priority: "high",
      status: "pending",
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: "default-task-2",
      title: "Follow up on TransNamib expansion proposal",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      priority: "medium",
      status: "pending",
      createdAt: new Date(Date.now() - 7200000),
    },
  ]);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>(getDefaultReminders);
  const [showReminders, setShowReminders] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Derived ---
  const pendingTaskCount = tasks.filter((t) => t.status === "pending").length;
  const showSuggestions = messages.length <= 1;

  // --- Effects ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // --- Callbacks ---
  const createTask = useCallback(
    (text: string) => {
      const title = parseTaskTitle(text);
      const priority = parsePriorityFromText(text);
      const newTask: ScheduledTask = {
        id: generateTaskId(),
        title,
        dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
        priority,
        status: "pending",
        createdAt: new Date(),
      };
      setTasks((prev) => [newTask, ...prev]);
      // Auto-open panel when task is created
      setShowTaskPanel(true);
    },
    []
  );

  const toggleTaskStatus = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === "pending" ? "done" : "pending" }
          : t
      )
    );
  }, []);

  const dismissTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const dismissReminder = useCallback((remId: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== remId));
  }, []);

  const updateRemindersFromTopic = useCallback((topic: string | null) => {
    if (!topic) return;
    const contextualReminders: Record<string, Reminder> = {
      "job cards": {
        id: `ctx-${Date.now()}`,
        text: "8 open job cards need assignment",
        type: "warning",
        icon: <Wrench className="h-3.5 w-3.5" />,
      },
      customer: {
        id: `ctx-${Date.now()}`,
        text: "Namdeb Diamond Corp re-engagement overdue",
        type: "info",
        icon: <Users className="h-3.5 w-3.5" />,
      },
      finance: {
        id: `ctx-${Date.now()}`,
        text: "INV-2602-0003 is 19 days overdue ($3,220)",
        type: "urgent",
        icon: <DollarSign className="h-3.5 w-3.5" />,
      },
      staff: {
        id: `ctx-${Date.now()}`,
        text: "David Kapere performance review needed",
        type: "warning",
        icon: <BarChart3 className="h-3.5 w-3.5" />,
      },
      inventory: {
        id: `ctx-${Date.now()}`,
        text: "OBD-II connectors critically low (3 left)",
        type: "urgent",
        icon: <Package className="h-3.5 w-3.5" />,
      },
      hr: {
        id: `ctx-${Date.now()}`,
        text: "James Shilongo contract renewal due March 15",
        type: "info",
        icon: <FileText className="h-3.5 w-3.5" />,
      },
      ticket: {
        id: `ctx-${Date.now()}`,
        text: "GPS signal loss ticket escalated to critical",
        type: "urgent",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
      },
    };
    const newReminder = contextualReminders[topic];
    if (newReminder) {
      setReminders((prev) => {
        // Avoid duplicate reminder text
        if (prev.some((r) => r.text === newReminder.text)) return prev;
        return [newReminder, ...prev].slice(0, 5);
      });
      setShowReminders(true);
    }
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
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

      setTimeout(() => {
        const {
          response,
          topic,
          shouldCreateTask,
        } = getAIResponse(text, lastTopic, tasks);

        if (shouldCreateTask) {
          createTask(text);
        }

        if (topic) {
          setLastTopic(topic);
          updateRemindersFromTopic(topic);
        }

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
      }, 800 + Math.random() * 1200);
    },
    [lastTopic, tasks, createTask, updateRemindersFromTopic]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    sendMessage(suggestion.prompt);
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt);
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
        content: `Chat reset! ${getGreeting()}, Johannes. I'm ready to help. What would you like to know about your business?`,
        timestamp: new Date(),
      },
    ]);
    setLastTopic(null);
    setReminders(getDefaultReminders());
  };

  // --- Render Helpers ---
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, i) => {
      if (line.trim() === "") return <br key={i} />;

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

      if (
        line.trimStart().startsWith("- ") ||
        line.trimStart().match(/^\d+\./)
      ) {
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

  // --- Render ---
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50">
      {/* Reminders Bar */}
      <AnimatePresence>
        {showReminders && reminders.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="relative border-b border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-4 py-2.5 sm:px-6">
              <div className="mx-auto flex max-w-6xl items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">
                    Reminders
                  </span>
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {reminders.length}
                  </span>
                </div>
                <div className="flex flex-1 items-center gap-2 overflow-x-auto">
                  {reminders.map((rem) => (
                    <div
                      key={rem.id}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                        rem.type === "urgent" &&
                          "bg-red-100 text-red-700",
                        rem.type === "warning" &&
                          "bg-amber-100 text-amber-700",
                        rem.type === "info" &&
                          "bg-blue-100 text-blue-700"
                      )}
                    >
                      {rem.icon}
                      <span>{rem.text}</span>
                      <button
                        onClick={() => dismissReminder(rem.id)}
                        className="ml-1 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowReminders(false)}
                  className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-600"
                  title="Hide reminders"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed reminder toggle */}
      {!showReminders && reminders.length > 0 && (
        <button
          onClick={() => setShowReminders(true)}
          className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-50 sm:px-6"
        >
          <Bell className="h-3.5 w-3.5" />
          <span>
            {reminders.length} reminder{reminders.length !== 1 ? "s" : ""}
          </span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
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
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-xs font-medium text-green-700">Online</span>
          </div>
          <button
            onClick={handleReset}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Reset conversation"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {/* Task Panel Toggle */}
          <button
            onClick={() => setShowTaskPanel((prev) => !prev)}
            className={cn(
              "relative rounded-lg p-2 transition-colors",
              showTaskPanel
                ? "bg-blue-100 text-blue-600"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            )}
            title="Toggle scheduled tasks"
          >
            <ListTodo className="h-4 w-4" />
            {pendingTaskCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                {pendingTaskCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Messages */}
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
                      <div className="space-y-0">
                        {renderContent(msg.content)}
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                    <p
                      className={cn(
                        "mt-2 text-[10px]",
                        msg.role === "user"
                          ? "text-blue-200"
                          : "text-slate-400"
                      )}
                    >
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {msg.role === "assistant" &&
                      msg.id !== "welcome" &&
                      msg.id !== "welcome-reset" && (
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
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                        style={{ animationDelay: "300ms" }}
                      />
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
                      <div className="mt-0.5 shrink-0">
                        {suggestion.icon}
                      </div>
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

          {/* Quick Actions Bar */}
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 sm:px-6">
            <div className="mx-auto flex max-w-3xl items-center gap-2 overflow-x-auto">
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Quick Actions
              </span>
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  disabled={isTyping}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </div>

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
              TRAXX AI uses mock data for demonstration. In production, it
              connects to your live database.
            </p>
          </div>
        </div>

        {/* Scheduled Tasks Side Panel */}
        <AnimatePresence>
          {showTaskPanel && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex flex-col overflow-hidden border-l border-slate-200 bg-white"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Scheduled Tasks
                  </h2>
                  {pendingTaskCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-[11px] font-semibold text-blue-700">
                      {pendingTaskCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowTaskPanel(false)}
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Task List */}
              <div className="flex-1 overflow-y-auto p-3">
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <CalendarCheck className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">
                      No tasks yet
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Ask TRAXX AI to schedule a task or set a reminder
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Pending Tasks */}
                    {tasks.filter((t) => t.status === "pending").length >
                      0 && (
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Pending
                        </p>
                        <div className="space-y-2">
                          {tasks
                            .filter((t) => t.status === "pending")
                            .map((task) => (
                              <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: 50 }}
                                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-800">
                                      {task.title}
                                    </p>
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <PriorityBadge
                                        priority={task.priority}
                                      />
                                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <Clock className="h-3 w-3" />
                                        {formatTaskDate(task.dueDate)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <button
                                      onClick={() =>
                                        toggleTaskStatus(task.id)
                                      }
                                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-green-100 hover:text-green-600"
                                      title="Mark as done"
                                    >
                                      <CircleCheck className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        dismissTask(task.id)
                                      }
                                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-500"
                                      title="Dismiss task"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Completed Tasks */}
                    {tasks.filter((t) => t.status === "done").length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Completed
                        </p>
                        <div className="space-y-2">
                          {tasks
                            .filter((t) => t.status === "done")
                            .map((task) => (
                              <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="rounded-xl border border-slate-100 bg-white p-3 opacity-60"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-500 line-through">
                                      {task.title}
                                    </p>
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                                        done
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <button
                                      onClick={() =>
                                        toggleTaskStatus(task.id)
                                      }
                                      className="rounded-md p-1 text-green-500 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                      title="Mark as pending"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        dismissTask(task.id)
                                      }
                                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-500"
                                      title="Remove task"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Panel Footer */}
              <div className="border-t border-slate-200 px-4 py-3">
                <button
                  onClick={() =>
                    sendMessage("Schedule a task to review pending items")
                  }
                  disabled={isTyping}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Task via AI
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
