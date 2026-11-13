"use client";

import { useState, useRef, useEffect, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Bot,
  Send,
  User,
  Sparkles,
  Lightbulb,
  Wrench,
  Users,
  FileText,
  DollarSign,
  RefreshCw,
  Copy,
  Check,
  CalendarCheck,
  Bell,
  ListTodo,
  Clock,
  AlertTriangle,
  Target,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  LifeBuoy,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/providers/session-provider";
import { useTasks, useCreateTask, useUpdateTask, type Task } from "@/lib/hooks/use-tasks";
import { useNotifications, useMarkNotificationRead } from "@/lib/hooks/use-notifications";
import {
  answerTraxxQuestion,
  parseTaskRequest,
  formatDueKey,
  toDateKey,
  HELP_TEXT,
} from "@/lib/traxx-answers";
import type { Priority } from "@/lib/supabase/database.types";

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

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** "send" asks the question; "fill" pre-fills the input so the user finishes it. */
  mode: "send" | "fill";
  prompt: string;
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

const subscribeNoop = () => () => {};

let msgCounter = 0;
function newId(prefix: string): string {
  msgCounter += 1;
  return `${prefix}-${Date.now()}-${msgCounter}`;
}

const OPEN = (t: Task) => t.status !== "DONE" && t.status !== "CANCELLED";
const dueKey = (t: Task) => (t.due_date ? t.due_date.slice(0, 10) : null);

function welcomeMessage(name: string | undefined, reset = false): Message {
  const first = name?.split(" ")[0];
  return {
    id: reset ? "welcome-reset" : "welcome",
    role: "assistant",
    content: reset
      ? `Chat reset. ${getGreeting()}${first ? `, ${first}` : ""}. What would you like to check?`
      : `${getGreeting()}${first ? `, ${first}` : ""}! I'm **TRAXX**, your business assistant. I answer from live data you have access to: tasks, job cards, tickets, invoices, customers, leave and notifications.\n\nI can also create tasks and reminders for you, e.g. "Remind me to call the bank tomorrow". Ask a question or tap a suggestion below.`,
    timestamp: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Suggestions & quick actions (prompts only — answers come from live data)
// ---------------------------------------------------------------------------

const quickSuggestions: Suggestion[] = [
  {
    id: "s-tasks",
    title: "My Open Tasks",
    description: "Open and overdue tasks",
    icon: <ListTodo className="h-5 w-5 text-blue-500" />,
    prompt: "Show my open and overdue tasks",
  },
  {
    id: "s-jobs",
    title: "Job Cards",
    description: "In progress and scheduled today",
    icon: <Wrench className="h-5 w-5 text-indigo-500" />,
    prompt: "Which job cards are in progress or scheduled today?",
  },
  {
    id: "s-tickets",
    title: "Support Tickets",
    description: "Open tickets by priority",
    icon: <LifeBuoy className="h-5 w-5 text-purple-500" />,
    prompt: "Show open tickets by priority",
  },
  {
    id: "s-invoices",
    title: "Outstanding Invoices",
    description: "Unpaid total and overdue balances",
    icon: <DollarSign className="h-5 w-5 text-amber-500" />,
    prompt: "What is the outstanding invoices total?",
  },
  {
    id: "s-customers",
    title: "Customers",
    description: "Customer count by status",
    icon: <Users className="h-5 w-5 text-emerald-500" />,
    prompt: "How many customers do we have, and how many are active?",
  },
  {
    id: "s-leave",
    title: "Leave Requests",
    description: "Requests waiting for approval",
    icon: <FileText className="h-5 w-5 text-cyan-500" />,
    prompt: "Show pending leave requests",
  },
];

const quickActions: QuickAction[] = [
  { id: "qa-task", label: "Schedule Task", icon: <CalendarCheck className="h-4 w-4" />, mode: "fill", prompt: "Schedule a task to " },
  { id: "qa-rem", label: "Set Reminder", icon: <Bell className="h-4 w-4" />, mode: "fill", prompt: "Remind me to " },
  { id: "qa-brief", label: "Daily Briefing", icon: <Target className="h-4 w-4" />, mode: "send", prompt: "Daily briefing" },
  { id: "qa-overdue", label: "Overdue Tasks", icon: <AlertTriangle className="h-4 w-4" />, mode: "send", prompt: "Show my overdue tasks" },
];

// ---------------------------------------------------------------------------
// Priority Badge
// ---------------------------------------------------------------------------

function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    LOW: "bg-slate-100 text-slate-600",
    MEDIUM: "bg-blue-100 text-blue-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-100 text-red-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", styles[priority])}>
      {priority.toLowerCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TraxxAIPage() {
  const { profile } = useAuth();
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks();
  const { data: notifications = [] } = useNotifications();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const markRead = useMarkNotificationRead();

  // --- State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [showReminders, setShowReminders] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Derived (all live data) ---
  const today = toDateKey(new Date());
  const myTasks = useMemo(
    () => (profile ? allTasks.filter((t) => t.assignee_id === profile.id) : []),
    [allTasks, profile]
  );
  const myOpenTasks = useMemo(
    () =>
      myTasks.filter(OPEN).sort((a, b) => {
        const ad = dueKey(a) ?? "9999";
        const bd = dueKey(b) ?? "9999";
        return ad.localeCompare(bd);
      }),
    [myTasks]
  );
  const myDoneTasks = useMemo(
    () =>
      myTasks
        .filter((t) => t.status === "DONE")
        .sort((a, b) => (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at))
        .slice(0, 5),
    [myTasks]
  );
  const myOverdue = myOpenTasks.filter((t) => {
    const d = dueKey(t);
    return d !== null && d < today;
  });
  const unread = notifications.filter((n) => !n.is_read);
  const reminderCount = unread.length + (myOverdue.length > 0 ? 1 : 0);

  // The greeting and timestamps depend on the viewer's clock, so build them only in the browser
  // (the server renders in UTC, which would not match and breaks hydration).
  const inBrowser = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const shownMessages = messages.length ? messages : inBrowser ? [welcomeMessage(profile?.name)] : [];
  const showSuggestions = messages.length === 0;

  // --- Effects ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // --- Chat ---
  const sendMessage = async (text: string) => {
      const question = text.trim();
      if (!question || isTyping) return;

      const base = messages.length ? messages : [welcomeMessage(profile?.name)];
      setMessages([...base, { id: newId("u"), role: "user", content: question, timestamp: new Date() }]);
      setInput("");
      setIsTyping(true);

      let reply: string;
      if (!profile) {
        reply = "I couldn't find your staff profile, so I can't look anything up yet. Try signing out and back in.";
      } else {
        const taskReq = parseTaskRequest(question);
        if (taskReq) {
          try {
            await createTask.mutateAsync({
              title: taskReq.title,
              due_date: taskReq.dueDate,
              priority: taskReq.priority,
              assignee_id: profile.id,
              status: "TODO",
            });
            setShowTaskPanel(true);
            reply = `**Task created**\n\n- **Task:** ${taskReq.title}\n- **Due:** ${formatDueKey(taskReq.dueDate)}\n- **Priority:** ${taskReq.priority.toLowerCase()}\n\nIt's assigned to you and shows in the Tasks panel and on the Tasks page.`;
          } catch (e) {
            reply = `Sorry, I couldn't create that task (${e instanceof Error ? e.message : "unknown error"}).`;
          }
        } else if (/^(schedule|remind|set a reminder|add a task|create a task)\b/i.test(question)) {
          reply = 'Tell me what the task is, e.g. "Remind me to call the supplier tomorrow" or "Schedule a task to review stock by Friday".';
        } else {
          const res = await answerTraxxQuestion(question, {
            id: profile.id,
            name: profile.name,
            role: profile.role,
          });
          reply = res.text;
        }
      }

      setMessages((prev) => [...prev, { id: newId("a"), role: "assistant", content: reply, timestamp: new Date() }]);
      setIsTyping(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.mode === "send") {
      void sendMessage(action.prompt);
    } else {
      setInput(action.prompt);
      inputRef.current?.focus();
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content.replace(/\*\*/g, ""));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setMessages([welcomeMessage(profile?.name, true)]);
  };

  const setTaskDone = (t: Task, done: boolean) => {
    updateTask.mutate({
      id: t.id,
      status: done ? "DONE" : "TODO",
      completed_at: done ? new Date().toISOString() : null,
    });
  };

  // --- Render helpers ---
  const renderContent = (content: string) =>
    content.split("\n").map((line, i) => {
      if (line.trim() === "") return <br key={i} />;
      const rendered = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        )
      );
      const isList = line.trimStart().startsWith("- ") || /^\s*\d+\./.test(line);
      return (
        <p key={i} className={cn("py-0.5", isList && "ml-2")}>
          {rendered}
        </p>
      );
    });

  // --- Render ---
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50">
      {/* Reminders bar: unread notifications + overdue tasks (live) */}
      <AnimatePresence>
        {showReminders && reminderCount > 0 && (
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
                  <span className="text-xs font-semibold text-blue-700">Reminders</span>
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {reminderCount}
                  </span>
                </div>
                <div className="flex flex-1 items-center gap-2 overflow-x-auto">
                  {myOverdue.length > 0 && (
                    <button
                      onClick={() => setShowTaskPanel(true)}
                      className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {myOverdue.length} overdue task{myOverdue.length === 1 ? "" : "s"}
                    </button>
                  )}
                  {unread.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      title={n.message}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                        n.type === "ERROR" && "bg-red-100 text-red-700",
                        n.type === "WARNING" && "bg-amber-100 text-amber-700",
                        n.type !== "ERROR" && n.type !== "WARNING" && "bg-blue-100 text-blue-700"
                      )}
                    >
                      {n.type === "ERROR" || n.type === "WARNING" ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      {n.link ? (
                        <Link href={n.link} className="hover:underline">
                          {n.title}
                        </Link>
                      ) : (
                        <span>{n.title}</span>
                      )}
                      <button
                        onClick={() => markRead.mutate(n.id)}
                        className="ml-1 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
                        title="Mark as read"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {unread.length > 8 && <span className="shrink-0 text-xs text-blue-700">+{unread.length - 8} more</span>}
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

      {!showReminders && reminderCount > 0 && (
        <button
          onClick={() => setShowReminders(true)}
          className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-50 sm:px-6"
        >
          <Bell className="h-3.5 w-3.5" />
          <span>
            {reminderCount} reminder{reminderCount !== 1 ? "s" : ""}
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
            <p className="text-xs text-slate-500">Answers from your live business data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Reset conversation"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowTaskPanel((prev) => !prev)}
            className={cn(
              "relative rounded-lg p-2 transition-colors",
              showTaskPanel ? "bg-blue-100 text-blue-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            )}
            title="Toggle my tasks"
          >
            <ListTodo className="h-4 w-4" />
            {myOpenTasks.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                {myOpenTasks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-3xl space-y-6">
              {shownMessages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user" ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700 shadow-sm"
                    )}
                  >
                    {msg.role === "assistant" ? <div className="space-y-0">{renderContent(msg.content)}</div> : <p>{msg.content}</p>}
                    <p className={cn("mt-2 text-[10px]", msg.role === "user" ? "text-blue-200" : "text-slate-400")}>
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {msg.role === "assistant" && !msg.id.startsWith("welcome") && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="absolute -right-2 -top-2 hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm transition-colors hover:bg-slate-50 group-hover:block"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
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

          {showSuggestions && (
            <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="mx-auto max-w-3xl">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Quick Suggestions
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {quickSuggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => void sendMessage(s.prompt)}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className="mt-0.5 shrink-0">{s.icon}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{s.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{s.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 sm:px-6">
            <div className="mx-auto flex max-w-3xl items-center gap-2 overflow-x-auto">
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-slate-400">Quick Actions</span>
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
              <button
                onClick={() =>
                  setMessages((prev) => [
                    ...(prev.length ? prev : [welcomeMessage(profile?.name)]),
                    { id: newId("a"), role: "assistant", content: HELP_TEXT, timestamp: new Date() },
                  ])
                }
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                <Lightbulb className="h-4 w-4" />
                What can I ask?
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
            <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Ask about tasks, jobs, tickets, invoices... or "Remind me to..."'
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
              TRAXX matches keywords in your question and answers from live records you are allowed to see.
            </p>
          </div>
        </div>

        {/* My tasks panel */}
        <AnimatePresence>
          {showTaskPanel && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex flex-col overflow-hidden border-l border-slate-200 bg-white"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900">My Tasks</h2>
                  {myOpenTasks.length > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-[11px] font-semibold text-blue-700">
                      {myOpenTasks.length}
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

              <div className="flex-1 overflow-y-auto p-3">
                {tasksLoading ? (
                  <div className="flex justify-center py-12 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : myOpenTasks.length === 0 && myDoneTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <CalendarCheck className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No tasks assigned to you</p>
                    <p className="mt-1 text-xs text-slate-400">Ask TRAXX to schedule a task or set a reminder</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myOpenTasks.length > 0 && (
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Open</p>
                        <div className="space-y-2">
                          {myOpenTasks.map((task) => {
                            const d = dueKey(task);
                            const overdue = d !== null && d < today;
                            return (
                              <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                  "rounded-xl border p-3",
                                  overdue ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-slate-50"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-800">{task.title}</p>
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <PriorityBadge priority={task.priority} />
                                      <span className={cn("flex items-center gap-1 text-[10px]", overdue ? "text-red-600 font-semibold" : "text-slate-400")}>
                                        <Clock className="h-3 w-3" />
                                        {d ? `${overdue ? "Overdue · " : ""}${formatDueKey(d)}` : "No due date"}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setTaskDone(task, true)}
                                    disabled={updateTask.isPending}
                                    className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-green-100 hover:text-green-600 disabled:opacity-50"
                                    title="Mark as done"
                                  >
                                    <CircleCheck className="h-4 w-4" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {myDoneTasks.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Recently completed</p>
                        <div className="space-y-2">
                          {myDoneTasks.map((task) => (
                            <div key={task.id} className="rounded-xl border border-slate-100 bg-white p-3 opacity-60">
                              <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 flex-1 text-sm font-medium text-slate-500 line-through">{task.title}</p>
                                <button
                                  onClick={() => setTaskDone(task, false)}
                                  disabled={updateTask.isPending}
                                  className="shrink-0 rounded-md p-1 text-green-500 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                  title="Reopen"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 px-4 py-3 space-y-2">
                <button
                  onClick={() => {
                    setInput("Remind me to ");
                    inputRef.current?.focus();
                  }}
                  disabled={isTyping}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Task via TRAXX
                </button>
                <Link href="/tasks" className="block text-center text-xs text-blue-600 hover:underline">
                  Open the Tasks page
                </Link>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
