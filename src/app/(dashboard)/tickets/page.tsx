"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket as TicketIcon,
  Plus,
  Search,
  X,
  Clock,
  CheckCircle2,
  MessageSquare,
  CircleDot,
  Loader2,
  XCircle,
  RotateCcw,
  Send,
  Paperclip,
  User,
  Building2,
  Mail,
  Flag,
  Tag,
  Calendar,
  Hash,
  ChevronRight,
  ArrowLeft,
  LayoutList,
  LayoutGrid,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import {
  cn,
  getPriorityColor,
  formatDate,
  formatDateTime,
} from "@/lib/utils";
import {
  useTickets,
  useTicketComments,
  useCreateTicket,
  useUpdateTicket,
  useAddTicketComment,
  useDeleteTicket,
  type Ticket,
  type TicketInput,
} from "@/lib/hooks/use-tickets";
import type {
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Enum display maps
// ---------------------------------------------------------------------------

const categoryLabels: Record<TicketCategory, string> = {
  TECHNICAL: "Technical",
  BILLING: "Billing",
  GENERAL: "General",
  DEVICE: "Device",
  GPS: "GPS",
  INSTALLATION: "Installation",
  ACCOUNT: "Account",
  OTHER: "Other",
};

const categoryColors: Record<TicketCategory, string> = {
  TECHNICAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  BILLING:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  GENERAL: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  DEVICE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  GPS: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  INSTALLATION:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ACCOUNT:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  OTHER: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};

const statusIcons: Record<TicketStatus, React.ReactNode> = {
  OPEN: <CircleDot className="h-4 w-4 text-blue-500" />,
  IN_PROGRESS: <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />,
  RESOLVED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  CLOSED: <XCircle className="h-4 w-4 text-gray-400" />,
  REOPENED: <RotateCcw className="h-4 w-4 text-orange-500" />,
};

const statusLabels: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
};

const ticketStatusColors: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
  REOPENED: "bg-orange-100 text-orange-800",
};

const statusOptions: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
];

const priorityOptions: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const categoryOptions: TicketCategory[] = [
  "TECHNICAL",
  "BILLING",
  "GENERAL",
  "DEVICE",
  "GPS",
  "INSTALLATION",
  "ACCOUNT",
  "OTHER",
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className={cn("rounded-lg p-2.5", color)}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {value}
        </p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Create Ticket Modal
// ---------------------------------------------------------------------------

const emptyForm = {
  customer_name: "",
  company: "",
  email: "",
  subject: "",
  description: "",
  priority: "MEDIUM" as TicketPriority,
  category: "GENERAL" as TicketCategory,
};

function CreateTicketModal({
  onClose,
  onCreate,
  submitting,
}: {
  onClose: () => void;
  onCreate: (input: TicketInput) => Promise<void>;
  submitting: boolean;
}) {
  const [form, setForm] = useState(emptyForm);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.customer_name.trim() ||
      !form.subject.trim() ||
      !form.description.trim()
    ) {
      return;
    }
    await onCreate({
      customer_name: form.customer_name.trim(),
      subject: form.subject.trim(),
      description: form.description.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      priority: form.priority,
      category: form.category,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.97 }}
        className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <TicketIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Create Support Ticket
              </h2>
              <p className="text-xs text-slate-500">
                Submit a new support request
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {/* Customer Info Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Customer Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={form.customer_name}
                      onChange={(e) =>
                        setForm({ ...form, customer_name: e.target.value })
                      }
                      placeholder="Full name"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Company
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.company}
                      onChange={(e) =>
                        setForm({ ...form, company: e.target.value })
                      }
                      placeholder="Company name"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="email@company.com"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Brief description of the issue"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Description *
                </label>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={4}
                  placeholder="Provide detailed information about your issue..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Priority / Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priority: e.target.value as TicketPriority,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    {priorityOptions.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as TicketCategory,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {categoryLabels[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Ticket
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Ticket Detail View
// ---------------------------------------------------------------------------

function TicketDetail({
  ticket,
  onBack,
  onUpdateStatus,
  onDelete,
  updating,
}: {
  ticket: Ticket;
  onBack: () => void;
  onUpdateStatus: (status: TicketStatus) => void;
  onDelete: () => void;
  updating: boolean;
}) {
  const [reply, setReply] = useState("");
  const { data: comments = [] } = useTicketComments(ticket.id);
  const addComment = useAddTicketComment();

  async function handleSendReply() {
    if (!reply.trim()) return;
    try {
      await addComment.mutateAsync({
        ticketId: ticket.id,
        content: reply.trim(),
      });
      setReply("");
    } catch {
      // handled in hook
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="mt-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500">
                {ticket.ticket_number}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  ticketStatusColors[ticket.status]
                )}
              >
                {statusIcons[ticket.status]}
                {statusLabels[ticket.status]}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  getPriorityColor(ticket.priority)
                )}
              >
                {ticket.priority}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {ticket.subject}
            </h2>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-2">
          {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
            <button
              onClick={() => onUpdateStatus("RESOLVED")}
              disabled={updating}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {updating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Mark Resolved
            </button>
          )}
          {ticket.status !== "CLOSED" && (
            <button
              onClick={() => onUpdateStatus("CLOSED")}
              disabled={updating}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300"
            >
              Close Ticket
            </button>
          )}
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content — 2 cols */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
              Description
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {ticket.description}
            </p>
          </div>

          {/* Conversation Thread */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <MessageSquare className="h-4 w-4" />
                Conversation ({comments.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {comments.map((comment) => (
                <div key={comment.id} className="px-5 py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white",
                        comment.is_internal ? "bg-blue-600" : "bg-slate-500"
                      )}
                    >
                      {initials(comment.author_name)}
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {comment.author_name}
                    </span>
                    {comment.is_internal && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Internal
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {formatDateTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="ml-9 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {comment.content}
                  </p>
                </div>
              ))}

              {comments.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-slate-400">
                  No comments yet
                </div>
              )}
            </div>

            {/* Reply Box */}
            {ticket.status !== "CLOSED" && (
              <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                <div className="flex gap-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={3}
                    placeholder="Type your reply..."
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    disabled
                    title="File attachments coming soon"
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 cursor-not-allowed"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach File
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={addComment.isPending || !reply.trim()}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addComment.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Send Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-4">
          {/* Ticket Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
              Ticket Details
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Hash className="h-3.5 w-3.5" />
                  Ticket ID
                </span>
                <span className="text-xs font-medium text-slate-900 dark:text-white">
                  {ticket.ticket_number}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Tag className="h-3.5 w-3.5" />
                  Category
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    categoryColors[ticket.category]
                  )}
                >
                  {categoryLabels[ticket.category]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Flag className="h-3.5 w-3.5" />
                  Priority
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    getPriorityColor(ticket.priority)
                  )}
                >
                  {ticket.priority}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  Created
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  {formatDate(ticket.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  Updated
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  {formatDate(ticket.updated_at)}
                </span>
              </div>
              {ticket.resolved_at && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resolved
                  </span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {formatDate(ticket.resolved_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
              Customer
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {initials(ticket.customer_name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {ticket.customer_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {ticket.company ?? "—"}
                  </p>
                </div>
              </div>
              {ticket.email && (
                <div className="space-y-2 pt-1">
                  <a
                    href={`mailto:${ticket.email}`}
                    className="flex items-center gap-2 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {ticket.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TicketsPage() {
  const { data: tickets = [], isLoading, isError, error } = useTickets();
  const createTicket = useCreateTicket();
  const updateTicket = useUpdateTicket();
  const deleteTicket = useDeleteTicket();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "ALL">(
    "ALL"
  );
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "ALL">(
    "ALL"
  );
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return tickets.filter((ticket) => {
      const matchesSearch =
        q === "" ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.ticket_number.toLowerCase().includes(q) ||
        ticket.customer_name.toLowerCase().includes(q) ||
        (ticket.company ?? "").toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "ALL" || ticket.status === statusFilter;
      const matchesPriority =
        priorityFilter === "ALL" || ticket.priority === priorityFilter;
      const matchesCategory =
        categoryFilter === "ALL" || ticket.category === categoryFilter;
      return (
        matchesSearch && matchesStatus && matchesPriority && matchesCategory
      );
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const stats = useMemo(() => {
    return {
      open: tickets.filter((t) => t.status === "OPEN").length,
      inProgress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
      urgent: tickets.filter(
        (t) =>
          t.priority === "URGENT" &&
          t.status !== "RESOLVED" &&
          t.status !== "CLOSED"
      ).length,
      resolved: tickets.filter(
        (t) => t.status === "RESOLVED" || t.status === "CLOSED"
      ).length,
    };
  }, [tickets]);

  async function handleUpdateStatus(status: TicketStatus) {
    if (!selectedTicket) return;
    const resolved_at =
      status === "RESOLVED" ? new Date().toISOString() : undefined;
    try {
      const updated = await updateTicket.mutateAsync({
        id: selectedTicket.id,
        status,
        ...(resolved_at ? { resolved_at } : {}),
      });
      setSelectedTicket(updated);
    } catch {
      // handled in hook
    }
  }

  async function handleDelete() {
    if (!selectedTicket) return;
    if (
      !window.confirm(
        `Delete ticket ${selectedTicket.ticket_number}? This cannot be undone.`
      )
    )
      return;
    try {
      await deleteTicket.mutateAsync(selectedTicket.id);
      setSelectedTicket(null);
    } catch {
      // handled in hook
    }
  }

  async function handleCreate(input: TicketInput) {
    try {
      await createTicket.mutateAsync(input);
      setShowCreate(false);
    } catch {
      // handled in hook
    }
  }

  // Detail View
  if (selectedTicket) {
    return (
      <div className="space-y-6 p-6">
        <TicketDetail
          ticket={selectedTicket}
          onBack={() => setSelectedTicket(null)}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDelete}
          updating={updateTicket.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Support Tickets
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage customer support requests and issue tracking
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Open Tickets"
          value={isLoading ? "—" : String(stats.open)}
          icon={<CircleDot className="h-5 w-5 text-blue-600" />}
          color="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          label="In Progress"
          value={isLoading ? "—" : String(stats.inProgress)}
          icon={<Loader2 className="h-5 w-5 text-amber-600" />}
          color="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          label="Urgent"
          value={isLoading ? "—" : String(stats.urgent)}
          icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
          color="bg-orange-50 dark:bg-orange-900/20"
        />
        <StatCard
          label="Resolved"
          value={isLoading ? "—" : String(stats.resolved)}
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          color="bg-green-50 dark:bg-green-900/20"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by subject, ID, customer..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as TicketStatus | "ALL")
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="ALL">All Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) =>
            setPriorityFilter(e.target.value as TicketPriority | "ALL")
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="ALL">All Priority</option>
          {priorityOptions.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as TicketCategory | "ALL")
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="ALL">All Categories</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {categoryLabels[c]}
            </option>
          ))}
        </select>

        <div className="flex items-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded-l-lg p-2.5 transition-colors",
              viewMode === "list"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded-r-lg p-2.5 transition-colors",
              viewMode === "grid"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Loading tickets…</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 shadow-sm">
          <p className="text-lg font-medium text-red-700">
            Failed to load tickets
          </p>
          <p className="mt-1 text-sm text-red-500">
            {(error as Error)?.message ?? "Please try again."}
          </p>
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-5 py-3">Ticket</th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTickets.map((ticket, idx) => (
                <motion.tr
                  key={ticket.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400">
                      {ticket.ticket_number}
                    </span>
                  </td>
                  <td className="max-w-xs px-5 py-3.5">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {ticket.subject}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {ticket.customer_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ticket.company ?? "—"}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        categoryColors[ticket.category]
                      )}
                    >
                      {categoryLabels[ticket.category]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        getPriorityColor(ticket.priority)
                      )}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        ticketStatusColors[ticket.status]
                      )}
                    >
                      {statusIcons[ticket.status]}
                      {statusLabels[ticket.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {formatDate(ticket.updated_at)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicket(ticket);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filteredTickets.length === 0 && (
            <div className="py-12 text-center">
              <TicketIcon className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">No tickets found</p>
              <p className="text-xs text-slate-400">
                {tickets.length === 0
                  ? "Create your first ticket to get started"
                  : "Try adjusting your filters"}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 gap-4">
          {filteredTickets.map((ticket, idx) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => setSelectedTicket(ticket)}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
            >
              <div className="mb-3 flex items-start justify-between">
                <span className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400">
                  {ticket.ticket_number}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    ticketStatusColors[ticket.status]
                  )}
                >
                  {statusIcons[ticket.status]}
                  {statusLabels[ticket.status]}
                </span>
              </div>

              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                {ticket.subject}
              </h3>
              <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {ticket.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {initials(ticket.customer_name)}
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {ticket.customer_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      getPriorityColor(ticket.priority)
                    )}
                  >
                    {ticket.priority}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      categoryColors[ticket.category]
                    )}
                  >
                    {categoryLabels[ticket.category]}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
                <Clock className="h-3.5 w-3.5" />
                Updated {formatDate(ticket.updated_at)}
              </div>
            </motion.div>
          ))}

          {filteredTickets.length === 0 && (
            <div className="col-span-2 py-12 text-center">
              <TicketIcon className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">No tickets found</p>
              <p className="text-xs text-slate-400">
                {tickets.length === 0
                  ? "Create your first ticket to get started"
                  : "Try adjusting your filters"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateTicketModal
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
            submitting={createTicket.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
