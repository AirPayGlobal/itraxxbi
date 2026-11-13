// TRAXX: rule-based answers computed from live Supabase data.
// No LLM is involved — a question is keyword-matched to a topic, the topic's
// query runs with the signed-in user's permissions (RLS), and the result is
// formatted as light markdown (**bold**, "- " bullets) for the chat UI.

import { createClient } from "@/lib/supabase/client";
import type { Priority, UserRole } from "@/lib/supabase/database.types";
import { formatCurrency } from "@/lib/utils";

const supabase = createClient();

export type TraxxUser = { id: string; name: string; role: UserRole };

export type TraxxTopic =
  | "tasks"
  | "jobs"
  | "tickets"
  | "invoices"
  | "customers"
  | "leave"
  | "notifications"
  | "briefing"
  | "help";

const MANAGER_ROLES: UserRole[] = ["ADMIN", "MANAGER"];
const FINANCE_ROLES: UserRole[] = ["ADMIN", "MANAGER", "VIEWER"];

// ---------------------------------------------------------------------------
// Date helpers (shared with Meeting AI's action-item extraction)
// ---------------------------------------------------------------------------

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Finds a relative due date in free text ("tomorrow", "by Friday", "next week",
 * "in 3 days", "end of the week", "today"). Returns YYYY-MM-DD or null.
 */
export function parseDueDate(text: string, base: Date = new Date()): string | null {
  const lower = text.toLowerCase();

  const inDays = lower.match(/\bin (\d{1,2}) days?\b/);
  if (inDays) return toDateKey(addDays(base, Number(inDays[1])));
  if (/\btomorrow\b/.test(lower)) return toDateKey(addDays(base, 1));
  if (/\b(today|tonight|this (morning|afternoon|evening)|end of (the )?day|eod)\b/.test(lower)) {
    return toDateKey(base);
  }
  if (/\bend of (the |this )?week\b/.test(lower)) {
    const diff = (5 - base.getDay() + 7) % 7; // coming Friday (today if Friday)
    return toDateKey(addDays(base, diff));
  }
  if (/\bnext week\b/.test(lower)) return toDateKey(addDays(base, 7));
  if (/\bend of (the |this )?month\b/.test(lower)) {
    return toDateKey(new Date(base.getFullYear(), base.getMonth() + 1, 0));
  }

  const dayMatch = lower.match(
    /\b(next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/
  );
  if (dayMatch) {
    const target = WEEKDAYS.indexOf(dayMatch[2]);
    let diff = (target - base.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    if (dayMatch[1]) diff += diff < 7 ? 7 : 0;
    return toDateKey(addDays(base, diff));
  }
  return null;
}

/** "2026-11-14" -> "Sat, Nov 14" (no timezone shift for date-only values). */
export function formatDueKey(key: string): string {
  const [y, m, d] = key.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Task / reminder creation from chat
// ---------------------------------------------------------------------------

const TASK_TRIGGERS = [
  "schedule a task to",
  "schedule a task",
  "schedule task to",
  "schedule task",
  "remind me to",
  "remind me",
  "set a reminder to",
  "set a reminder",
  "set reminder to",
  "set reminder",
  "add a task to",
  "add a task",
  "add task",
  "create a task to",
  "create a task",
  "create task",
];

export type TaskRequest = { title: string; dueDate: string; priority: Priority };

/** Returns a task to create when the message asks to schedule something, else null. */
export function parseTaskRequest(text: string, base: Date = new Date()): TaskRequest | null {
  const lower = text.toLowerCase();
  const trigger = TASK_TRIGGERS.find((t) => lower.includes(t));
  if (!trigger) return null;

  let title = text.slice(lower.indexOf(trigger) + trigger.length).trim();
  // Strip the date phrase and priority words so the title reads cleanly.
  title = title
    .replace(
      /\b(by|on|before|for)?\s*(next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi,
      ""
    )
    .replace(
      /\b(by |before )?(tomorrow|today|tonight|this (morning|afternoon|evening)|end of (the |this )?(day|week|month)|next week|in \d{1,2} days?)\b/gi,
      ""
    )
    .replace(/\b(urgent(ly)?|asap|high priority|low priority|important)\b/gi, "")
    .replace(/^(to|for|about|that)\s+/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,.;:-]+$/, "")
    .trim();
  if (!title) return null;

  let priority: Priority = "MEDIUM";
  if (/\b(urgent|asap)\b/.test(lower)) priority = "URGENT";
  else if (/\b(high priority|important)\b/.test(lower)) priority = "HIGH";
  else if (/\blow priority\b/.test(lower)) priority = "LOW";

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    dueDate: parseDueDate(text, base) ?? toDateKey(addDays(base, 1)),
    priority,
  };
}

// ---------------------------------------------------------------------------
// Topic matching
// ---------------------------------------------------------------------------

const TOPIC_KEYWORDS: [TraxxTopic, RegExp][] = [
  ["help", /\b(help|what can you|capabilit|how do i)\b/],
  ["briefing", /\b(briefing|agenda|my day|today'?s plan|summary of today|daily)\b/],
  ["invoices", /\b(invoice|outstanding|owed|unpaid|receivable|billing|revenue|financ)/],
  ["leave", /\b(leave|holiday|vacation|time off|absence)\b/],
  ["tickets", /\b(ticket|support|helpdesk|complaint)/],
  ["jobs", /\b(job|jobs|job card|work order|installation|scheduled today)\b/],
  ["customers", /\b(customer|client|account|crm)/],
  ["notifications", /\b(notification|unread|alert|inbox)/],
  ["tasks", /\b(task|tasks|to-?do|overdue|my work|assigned to me)\b/],
];

export function matchTopic(question: string): TraxxTopic | null {
  const lower = question.toLowerCase();
  for (const [topic, re] of TOPIC_KEYWORDS) if (re.test(lower)) return topic;
  return null;
}

export const HELP_TEXT = [
  "**What I can answer** (from live data you have access to):",
  "",
  "- **Tasks** — \"my open tasks\", \"overdue tasks\"",
  "- **Job cards** — \"jobs in progress\", \"jobs scheduled today\"",
  "- **Tickets** — \"open tickets by priority\"",
  "- **Invoices** — \"outstanding invoices\" (finance roles)",
  "- **Customers** — \"how many customers\", \"active customers\"",
  "- **Leave** — \"pending leave requests\"",
  "- **Notifications** — \"unread notifications\"",
  "- **Briefing** — \"daily briefing\"",
  "",
  "I can also create real tasks: \"Remind me to call the bank tomorrow\" or \"Schedule a task to review stock by Friday\".",
].join("\n");

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

const OPEN_TASK = "(DONE,CANCELLED)";

async function answerTasks(question: string, me: TraxxUser): Promise<string> {
  const lower = question.toLowerCase();
  const everyone = MANAGER_ROLES.includes(me.role) && !/\b(my|mine|me)\b/.test(lower);
  let q = supabase
    .from("tasks")
    .select("id, title, due_date, priority, status, assignee_id")
    .not("status", "in", OPEN_TASK)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (!everyone) q = q.eq("assignee_id", me.id);
  const { data, error } = await q;
  if (error) throw error;
  const tasks = data ?? [];
  const scope = everyone ? "across the team" : "assigned to you";
  if (tasks.length === 0) return `**Open tasks ${scope}:** none. Nothing is waiting.`;

  const today = toDateKey(new Date());
  const overdue = tasks.filter((t) => t.due_date && t.due_date.slice(0, 10) < today);
  const dueToday = tasks.filter((t) => t.due_date && t.due_date.slice(0, 10) === today);

  let names = new Map<string, string>();
  if (everyone) {
    const ids = [...new Set(tasks.map((t) => t.assignee_id).filter((x): x is string => !!x))];
    if (ids.length) {
      const { data: people } = await supabase.from("profiles").select("id, name").in("id", ids);
      names = new Map((people ?? []).map((p) => [p.id, p.name]));
    }
  }
  const line = (t: (typeof tasks)[number]) =>
    `- **${t.title}** — ${t.due_date ? `due ${formatDueKey(t.due_date)}` : "no due date"} · ${t.priority.toLowerCase()}` +
    (everyone ? ` · ${t.assignee_id ? names.get(t.assignee_id) ?? "assigned" : "unassigned"}` : "");

  const onlyOverdue = /\boverdue|late\b/.test(lower);
  const list = (onlyOverdue ? overdue : [...overdue, ...tasks.filter((t) => !overdue.includes(t))]).slice(0, 8);
  const out = [
    `**Open tasks ${scope}:** ${tasks.length}`,
    `- Overdue: **${overdue.length}**`,
    `- Due today: **${dueToday.length}**`,
    "",
  ];
  if (list.length) {
    out.push(onlyOverdue ? "**Overdue:**" : "**Most urgent first:**", ...list.map(line));
    const more = (onlyOverdue ? overdue.length : tasks.length) - list.length;
    if (more > 0) out.push(`…and ${more} more on the Tasks page.`);
  } else if (onlyOverdue) {
    out.push("Nothing is overdue.");
  }
  return out.join("\n");
}

async function answerJobs(): Promise<string> {
  const today = toDateKey(new Date());
  const tomorrow = toDateKey(addDays(new Date(), 1));
  const [{ data: active, error: e1 }, { data: todays, error: e2 }] = await Promise.all([
    supabase
      .from("job_cards")
      .select("id, job_number, title, status, priority, location")
      .in("status", ["OPEN", "ASSIGNED", "IN_PROGRESS"]),
    supabase
      .from("job_cards")
      .select("id, job_number, title, status, location, scheduled_date")
      .gte("scheduled_date", today)
      .lt("scheduled_date", tomorrow)
      .not("status", "in", "(CANCELLED)"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const rows = active ?? [];
  const inProgress = rows.filter((j) => j.status === "IN_PROGRESS");
  const count = (s: string) => rows.filter((j) => j.status === s).length;
  const out = [
    "**Job cards**",
    `- In progress: **${inProgress.length}**`,
    `- Assigned (not started): **${count("ASSIGNED")}**`,
    `- Open (unassigned): **${count("OPEN")}**`,
    `- Scheduled today: **${(todays ?? []).length}**`,
  ];
  if ((todays ?? []).length) {
    out.push("", "**Scheduled today:**");
    for (const j of (todays ?? []).slice(0, 6)) {
      out.push(`- **${j.job_number}** ${j.title}${j.location ? ` — ${j.location}` : ""} (${j.status.replace("_", " ").toLowerCase()})`);
    }
  }
  if (inProgress.length) {
    out.push("", "**In progress:**");
    for (const j of inProgress.slice(0, 6)) out.push(`- **${j.job_number}** ${j.title}`);
    if (inProgress.length > 6) out.push(`…and ${inProgress.length - 6} more.`);
  }
  return out.join("\n");
}

async function answerTickets(): Promise<string> {
  const { data, error } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, priority, status, assigned_to_id")
    .in("status", ["OPEN", "IN_PROGRESS", "REOPENED"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return "**Open tickets:** none. The support queue is clear.";
  const by = (p: string) => rows.filter((t) => t.priority === p).length;
  const unassigned = rows.filter((t) => !t.assigned_to_id).length;
  const hot = rows.filter((t) => t.priority === "URGENT" || t.priority === "HIGH");
  const out = [
    `**Open tickets:** ${rows.length}`,
    `- Urgent: **${by("URGENT")}**`,
    `- High: **${by("HIGH")}**`,
    `- Medium: **${by("MEDIUM")}**`,
    `- Low: **${by("LOW")}**`,
    `- Unassigned: **${unassigned}**`,
  ];
  if (hot.length) {
    out.push("", "**Urgent and high priority (oldest first):**");
    for (const t of hot.slice(0, 6)) out.push(`- **${t.ticket_number}** ${t.subject} (${t.priority.toLowerCase()})`);
  }
  return out.join("\n");
}

async function answerInvoices(me: TraxxUser): Promise<string> {
  if (!FINANCE_ROLES.includes(me.role)) {
    return "Sorry, invoice figures are only available to admin, manager and viewer accounts, so I can't show them to you. Your manager or the finance team can help.";
  }
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, status, due_date")
    .in("status", ["SENT", "OVERDUE", "PARTIAL"]);
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return "**Outstanding invoices:** none. Everything sent has been paid.";

  const { data: pays, error: pe } = await supabase
    .from("payments")
    .select("invoice_id, amount")
    .in("invoice_id", rows.map((r) => r.id));
  if (pe) throw pe;
  const paid = new Map<string, number>();
  for (const p of pays ?? []) if (p.invoice_id) paid.set(p.invoice_id, (paid.get(p.invoice_id) ?? 0) + Number(p.amount));

  const today = toDateKey(new Date());
  const balance = (r: (typeof rows)[number]) => Math.max(0, Number(r.total) - (paid.get(r.id) ?? 0));
  const total = rows.reduce((s, r) => s + balance(r), 0);
  const overdue = rows.filter((r) => r.status === "OVERDUE" || (r.due_date && r.due_date.slice(0, 10) < today));
  const overdueTotal = overdue.reduce((s, r) => s + balance(r), 0);

  const out = [
    `**Outstanding invoices:** ${plural(rows.length, "invoice")} totalling **${formatCurrency(total)}**`,
    `- Overdue: **${overdue.length}** (${formatCurrency(overdueTotal)})`,
    `- Partially paid: **${rows.filter((r) => r.status === "PARTIAL").length}**`,
  ];
  const largest = [...overdue].sort((a, b) => balance(b) - balance(a)).slice(0, 5);
  if (largest.length) {
    out.push("", "**Largest overdue balances:**");
    for (const r of largest) {
      out.push(`- **${r.invoice_number}** ${formatCurrency(balance(r))}${r.due_date ? ` — due ${formatDueKey(r.due_date)}` : ""}`);
    }
  }
  return out.join("\n");
}

async function answerCustomers(): Promise<string> {
  const { data, error } = await supabase.from("customers").select("status");
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return "**Customers:** none recorded yet (or none visible to you).";
  const by = (s: string) => rows.filter((c) => c.status === s).length;
  return [
    `**Customers:** ${rows.length}`,
    `- Active: **${by("ACTIVE")}**`,
    `- Prospects: **${by("PROSPECT")}**`,
    `- Inactive: **${by("INACTIVE")}**`,
    `- Churned: **${by("CHURNED")}**`,
  ].join("\n");
}

async function answerLeave(me: TraxxUser): Promise<string> {
  const { data, error } = await supabase
    .from("leave_requests")
    .select("id, user_id, leave_type, start_date, end_date, days")
    .eq("status", "PENDING")
    .order("start_date", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  const scope = MANAGER_ROLES.includes(me.role) ? "" : " (that you can see)";
  if (rows.length === 0) return `**Pending leave requests${scope}:** none.`;
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data: people } = await supabase.from("profiles").select("id, name").in("id", ids);
  const names = new Map((people ?? []).map((p) => [p.id, p.name]));
  const out = [`**Pending leave requests${scope}:** ${rows.length}`, ""];
  for (const r of rows.slice(0, 8)) {
    out.push(
      `- **${names.get(r.user_id) ?? "Staff member"}** — ${r.leave_type.toLowerCase()}, ${formatDueKey(r.start_date)} to ${formatDueKey(r.end_date)} (${plural(Number(r.days), "day")})`
    );
  }
  if (rows.length > 8) out.push(`…and ${rows.length - 8} more on the HR page.`);
  return out.join("\n");
}

async function answerNotifications(me: TraxxUser): Promise<string> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, created_at")
    .eq("user_id", me.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return "**Unread notifications:** none. You're all caught up.";
  const out = [`**Unread notifications:** ${rows.length}`, ""];
  for (const n of rows.slice(0, 8)) out.push(`- ${n.title}`);
  return out.join("\n");
}

async function answerBriefing(me: TraxxUser): Promise<string> {
  const [tasks, jobs, notes] = await Promise.all([
    answerTasks("my tasks", me),
    answerJobs(),
    answerNotifications(me),
  ]);
  return [`**Daily briefing for ${formatDueKey(toDateKey(new Date()))}**`, "", tasks, "", jobs, "", notes].join("\n");
}

/** Answers a chat question from live data. Unknown questions get the help text. */
export async function answerTraxxQuestion(
  question: string,
  me: TraxxUser
): Promise<{ text: string; topic: TraxxTopic }> {
  const topic = matchTopic(question);
  try {
    switch (topic) {
      case "tasks":
        return { topic, text: await answerTasks(question, me) };
      case "jobs":
        return { topic, text: await answerJobs() };
      case "tickets":
        return { topic, text: await answerTickets() };
      case "invoices":
        return { topic, text: await answerInvoices(me) };
      case "customers":
        return { topic, text: await answerCustomers() };
      case "leave":
        return { topic, text: await answerLeave(me) };
      case "notifications":
        return { topic, text: await answerNotifications(me) };
      case "briefing":
        return { topic, text: await answerBriefing(me) };
      case "help":
        return { topic, text: HELP_TEXT };
      default:
        return {
          topic: "help",
          text: `I didn't recognise that question.\n\n${HELP_TEXT}`,
        };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return {
      topic: topic ?? "help",
      text: `Sorry, I couldn't load that data right now (${msg}). Please try again.`,
    };
  }
}
