"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  Plus,
  Search,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  Eye,
  ArrowUpRight,
  Filter,
  LayoutList,
  LayoutGrid,
  CircleDot,
  Loader2,
  XCircle,
  Send,
  Paperclip,
  User,
  Building2,
  Phone,
  Mail,
  Flag,
  Tag,
  Calendar,
  Hash,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import {
  cn,
  getStatusColor,
  getPriorityColor,
  formatDate,
  formatDateTime,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type TicketCategory =
  | "GPS_DEVICE"
  | "CONNECTIVITY"
  | "INSTALLATION"
  | "BILLING"
  | "SOFTWARE"
  | "GENERAL";

interface TicketComment {
  id: string;
  author: string;
  role: "customer" | "agent";
  message: string;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  customer: string;
  company: string;
  email: string;
  phone: string;
  assignedTo: string | null;
  vehicleReg: string | null;
  comments: TicketComment[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockTickets: SupportTicket[] = [
  {
    id: "1",
    ticketNumber: "TKT-2602-0001",
    subject: "GPS tracker not reporting on vehicle WK-4521",
    description:
      "The GPS device on our Toyota Hilux (WK-4521) has stopped transmitting location data since yesterday morning. We rely on real-time tracking for our delivery fleet and need this resolved urgently.",
    status: "OPEN",
    priority: "URGENT",
    category: "GPS_DEVICE",
    customer: "Johannes Shikundu",
    company: "Namibia Breweries Ltd",
    email: "j.shikundu@nbl.com.na",
    phone: "+264 61 320 4999",
    assignedTo: null,
    vehicleReg: "WK-4521",
    comments: [
      {
        id: "c1",
        author: "Johannes Shikundu",
        role: "customer",
        message:
          "Device last reported at 06:42 AM yesterday. Vehicle is parked at our depot. Please advise.",
        createdAt: "2026-02-28T09:15:00",
      },
    ],
    createdAt: "2026-02-28T08:30:00",
    updatedAt: "2026-02-28T09:15:00",
    resolvedAt: null,
  },
  {
    id: "2",
    ticketNumber: "TKT-2602-0002",
    subject: "Request installation on 3 new vehicles",
    description:
      "We have 3 new Land Cruisers that need GPS tracker installation. Please schedule a time for the installation team to come to our yard in Walvis Bay.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    category: "INSTALLATION",
    customer: "Maria van der Merwe",
    company: "TransNamib Holdings",
    email: "m.vandermerwe@transnamib.com.na",
    phone: "+264 61 298 2032",
    assignedTo: "David Amupolo",
    vehicleReg: null,
    comments: [
      {
        id: "c2",
        author: "Maria van der Merwe",
        role: "customer",
        message:
          "The vehicles are at our Walvis Bay depot. Available any weekday between 8AM and 4PM.",
        createdAt: "2026-02-27T10:00:00",
      },
      {
        id: "c3",
        author: "David Amupolo",
        role: "agent",
        message:
          "Hi Maria, I've scheduled our team for Thursday 6 March. They'll arrive at 9AM with all required equipment. Will that work for you?",
        createdAt: "2026-02-27T14:30:00",
      },
      {
        id: "c4",
        author: "Maria van der Merwe",
        role: "customer",
        message: "Thursday works perfectly. Thank you for the quick response!",
        createdAt: "2026-02-27T15:10:00",
      },
    ],
    createdAt: "2026-02-27T09:00:00",
    updatedAt: "2026-02-27T15:10:00",
    resolvedAt: null,
  },
  {
    id: "3",
    ticketNumber: "TKT-2602-0003",
    subject: "Monthly invoice discrepancy for February",
    description:
      "Our February invoice shows charges for 24 vehicles but we only have 22 active trackers. Please review and correct the billing.",
    status: "WAITING",
    priority: "MEDIUM",
    category: "BILLING",
    customer: "Hans Garoëb",
    company: "Pupkewitz Motors",
    email: "h.garoeb@pupkewitz.com",
    phone: "+264 61 224 081",
    assignedTo: "Sarah Nekongo",
    vehicleReg: null,
    comments: [
      {
        id: "c5",
        author: "Sarah Nekongo",
        role: "agent",
        message:
          "Hi Hans, I've reviewed the account and found 2 decommissioned trackers still active in the system. I've raised a credit note. Could you confirm the vehicle registrations that were removed?",
        createdAt: "2026-02-26T11:45:00",
      },
    ],
    createdAt: "2026-02-25T16:00:00",
    updatedAt: "2026-02-26T11:45:00",
    resolvedAt: null,
  },
  {
    id: "4",
    ticketNumber: "TKT-2602-0004",
    subject: "Dashboard showing incorrect vehicle locations",
    description:
      "Several of our vehicles are showing locations in the ocean on the tracking dashboard. This has been happening intermittently for the past 3 days.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    category: "SOFTWARE",
    customer: "Frieda Hamutenya",
    company: "Ohlthaver & List",
    email: "f.hamutenya@ol.na",
    phone: "+264 61 207 5111",
    assignedTo: "John Mutua",
    vehicleReg: null,
    comments: [
      {
        id: "c6",
        author: "John Mutua",
        role: "agent",
        message:
          "We've identified the issue — a firmware bug causing GPS coordinate drift. A patch is being deployed to affected devices. ETA: end of day tomorrow.",
        createdAt: "2026-02-27T16:00:00",
      },
      {
        id: "c7",
        author: "Frieda Hamutenya",
        role: "customer",
        message:
          "Thanks for the update. Will we need to do anything on our end once the patch is deployed?",
        createdAt: "2026-02-27T16:30:00",
      },
      {
        id: "c8",
        author: "John Mutua",
        role: "agent",
        message:
          "No action needed from your side. The update will be pushed over-the-air automatically. You may see devices go offline briefly during the update.",
        createdAt: "2026-02-27T17:00:00",
      },
    ],
    createdAt: "2026-02-26T10:00:00",
    updatedAt: "2026-02-27T17:00:00",
    resolvedAt: null,
  },
  {
    id: "5",
    ticketNumber: "TKT-2602-0005",
    subject: "Geofence alerts not triggering",
    description:
      "We set up geofence alerts for our restricted zones but are not receiving any notifications when vehicles enter or exit the zones.",
    status: "RESOLVED",
    priority: "MEDIUM",
    category: "SOFTWARE",
    customer: "Peter Shikongo",
    company: "Namibia Breweries Ltd",
    email: "p.shikongo@nbl.com.na",
    phone: "+264 61 320 5000",
    assignedTo: "David Amupolo",
    vehicleReg: null,
    comments: [
      {
        id: "c9",
        author: "David Amupolo",
        role: "agent",
        message:
          "The notification service had a configuration error. I've corrected the alert routing and tested with a sample geofence trigger. Alerts are now flowing correctly. Please verify on your end.",
        createdAt: "2026-02-25T14:00:00",
      },
      {
        id: "c10",
        author: "Peter Shikongo",
        role: "customer",
        message: "Confirmed — alerts are working now. Thank you!",
        createdAt: "2026-02-25T15:30:00",
      },
    ],
    createdAt: "2026-02-24T09:00:00",
    updatedAt: "2026-02-25T15:30:00",
    resolvedAt: "2026-02-25T15:30:00",
  },
  {
    id: "6",
    ticketNumber: "TKT-2602-0006",
    subject: "SIM card connectivity issue on 5 devices",
    description:
      "Five of our trackers are showing 'No SIM' or 'No Network' status. Vehicles are stationed at different locations across Windhoek. SIM cards were replaced 2 months ago.",
    status: "OPEN",
    priority: "HIGH",
    category: "CONNECTIVITY",
    customer: "Anna Kambonde",
    company: "Ohlthaver & List",
    email: "a.kambonde@ol.na",
    phone: "+264 61 207 5200",
    assignedTo: null,
    vehicleReg: null,
    comments: [],
    createdAt: "2026-03-01T07:45:00",
    updatedAt: "2026-03-01T07:45:00",
    resolvedAt: null,
  },
  {
    id: "7",
    ticketNumber: "TKT-2602-0007",
    subject: "Need API access for fleet management integration",
    description:
      "We want to integrate your tracking data into our in-house fleet management system. Requesting API credentials and documentation.",
    status: "CLOSED",
    priority: "LOW",
    category: "GENERAL",
    customer: "Lukas Ndjamba",
    company: "TransNamib Holdings",
    email: "l.ndjamba@transnamib.com.na",
    phone: "+264 61 298 2040",
    assignedTo: "Sarah Nekongo",
    vehicleReg: null,
    comments: [
      {
        id: "c11",
        author: "Sarah Nekongo",
        role: "agent",
        message:
          "API credentials and documentation have been sent to your email. The sandbox environment is ready for testing.",
        createdAt: "2026-02-20T10:00:00",
      },
      {
        id: "c12",
        author: "Lukas Ndjamba",
        role: "customer",
        message:
          "Received everything. Integration is complete and working. Closing this ticket.",
        createdAt: "2026-02-22T16:00:00",
      },
    ],
    createdAt: "2026-02-18T11:00:00",
    updatedAt: "2026-02-22T16:00:00",
    resolvedAt: "2026-02-22T16:00:00",
  },
  {
    id: "8",
    ticketNumber: "TKT-2602-0008",
    subject: "Tracker tamper alert on vehicle N-8832",
    description:
      "We received a tamper alert for vehicle N-8832 at 2:00 AM. The vehicle was parked at our secured lot. Need someone to inspect the device.",
    status: "IN_PROGRESS",
    priority: "URGENT",
    category: "GPS_DEVICE",
    customer: "Thomas Nghifikwa",
    company: "Pupkewitz Motors",
    email: "t.nghifikwa@pupkewitz.com",
    phone: "+264 61 224 090",
    assignedTo: "John Mutua",
    vehicleReg: "N-8832",
    comments: [
      {
        id: "c13",
        author: "John Mutua",
        role: "agent",
        message:
          "I'm dispatching a technician to your location this morning. ETA: 10:30 AM. We've also pulled the device logs — will share findings once the inspection is complete.",
        createdAt: "2026-03-01T08:00:00",
      },
    ],
    createdAt: "2026-03-01T06:15:00",
    updatedAt: "2026-03-01T08:00:00",
    resolvedAt: null,
  },
];

const categoryLabels: Record<TicketCategory, string> = {
  GPS_DEVICE: "GPS Device",
  CONNECTIVITY: "Connectivity",
  INSTALLATION: "Installation",
  BILLING: "Billing",
  SOFTWARE: "Software",
  GENERAL: "General",
};

const categoryColors: Record<TicketCategory, string> = {
  GPS_DEVICE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CONNECTIVITY:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  INSTALLATION:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  BILLING:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  SOFTWARE:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  GENERAL:
    "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const statusIcons: Record<TicketStatus, React.ReactNode> = {
  OPEN: <CircleDot className="h-4 w-4 text-blue-500" />,
  IN_PROGRESS: <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />,
  WAITING: <Clock className="h-4 w-4 text-orange-500" />,
  RESOLVED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  CLOSED: <XCircle className="h-4 w-4 text-gray-400" />,
};

const statusLabels: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING: "Awaiting Reply",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const ticketStatusColors: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  WAITING: "bg-orange-100 text-orange-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

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
  value: number;
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

function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "MEDIUM" as TicketPriority,
    category: "GENERAL" as TicketCategory,
    customer: "",
    company: "",
    email: "",
    phone: "",
    vehicleReg: "",
  });

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
              <Ticket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
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
                    value={form.customer}
                    onChange={(e) =>
                      setForm({ ...form, customer: e.target.value })
                    }
                    placeholder="Full name"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Company *
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

            {/* Contact Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email *
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
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="+264 61 000 0000"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Subject *
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) =>
                  setForm({ ...form, subject: e.target.value })
                }
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
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={4}
                placeholder="Provide detailed information about your issue..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Priority / Category / Vehicle */}
            <div className="grid grid-cols-3 gap-4">
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
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
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
                  <option value="GPS_DEVICE">GPS Device</option>
                  <option value="CONNECTIVITY">Connectivity</option>
                  <option value="INSTALLATION">Installation</option>
                  <option value="BILLING">Billing</option>
                  <option value="SOFTWARE">Software</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Vehicle Reg
                </label>
                <input
                  type="text"
                  value={form.vehicleReg}
                  onChange={(e) =>
                    setForm({ ...form, vehicleReg: e.target.value })
                  }
                  placeholder="e.g. WK-4521"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <Send className="h-4 w-4" />
            Submit Ticket
          </button>
        </div>
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
}: {
  ticket: SupportTicket;
  onBack: () => void;
}) {
  const [reply, setReply] = useState("");

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
                {ticket.ticketNumber}
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
            <button onClick={() => toast.success(`Ticket marked as resolved`)} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
              Mark Resolved
            </button>
          )}
          {ticket.status !== "CLOSED" && (
            <button onClick={() => toast.info(`Ticket closed`)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">
              Close Ticket
            </button>
          )}
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
                Conversation ({ticket.comments.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {ticket.comments.map((comment) => (
                <div key={comment.id} className="px-5 py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white",
                        comment.role === "agent"
                          ? "bg-blue-600"
                          : "bg-slate-500"
                      )}
                    >
                      {comment.author
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {comment.author}
                    </span>
                    {comment.role === "agent" && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Agent
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {formatDateTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="ml-9 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {comment.message}
                  </p>
                </div>
              ))}

              {ticket.comments.length === 0 && (
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
                  <button onClick={() => toast.info("File attachment — coming soon")} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach File
                  </button>
                  <button onClick={() => toast.success("Reply sent")} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    <Send className="h-3.5 w-3.5" />
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
                  {ticket.ticketNumber}
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
                  {formatDate(ticket.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  Updated
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  {formatDate(ticket.updatedAt)}
                </span>
              </div>
              {ticket.assignedTo && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <User className="h-3.5 w-3.5" />
                    Assigned
                  </span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {ticket.assignedTo}
                  </span>
                </div>
              )}
              {ticket.vehicleReg && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Ticket className="h-3.5 w-3.5" />
                    Vehicle
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-900 dark:bg-slate-800 dark:text-white">
                    {ticket.vehicleReg}
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
                  {ticket.customer
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {ticket.customer}
                  </p>
                  <p className="text-xs text-slate-500">{ticket.company}</p>
                </div>
              </div>
              <div className="space-y-2 pt-1">
                <a
                  href={`mailto:${ticket.email}`}
                  className="flex items-center gap-2 text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {ticket.email}
                </a>
                <a
                  href={`tel:${ticket.phone}`}
                  className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {ticket.phone}
                </a>
              </div>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<
    TicketPriority | "ALL"
  >("ALL");
  const [categoryFilter, setCategoryFilter] = useState<
    TicketCategory | "ALL"
  >("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );

  const filteredTickets = useMemo(() => {
    return mockTickets.filter((ticket) => {
      const matchesSearch =
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" || ticket.status === statusFilter;
      const matchesPriority =
        priorityFilter === "ALL" || ticket.priority === priorityFilter;
      const matchesCategory =
        categoryFilter === "ALL" || ticket.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const stats = useMemo(() => {
    return {
      open: mockTickets.filter((t) => t.status === "OPEN").length,
      inProgress: mockTickets.filter((t) => t.status === "IN_PROGRESS").length,
      waiting: mockTickets.filter((t) => t.status === "WAITING").length,
      resolved: mockTickets.filter(
        (t) => t.status === "RESOLVED" || t.status === "CLOSED"
      ).length,
    };
  }, []);

  // Detail View
  if (selectedTicket) {
    return (
      <div className="space-y-6 p-6">
        <TicketDetail
          ticket={selectedTicket}
          onBack={() => setSelectedTicket(null)}
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
          value={stats.open}
          icon={<CircleDot className="h-5 w-5 text-blue-600" />}
          color="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={<Loader2 className="h-5 w-5 text-amber-600" />}
          color="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          label="Awaiting Reply"
          value={stats.waiting}
          icon={<Clock className="h-5 w-5 text-orange-600" />}
          color="bg-orange-50 dark:bg-orange-900/20"
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
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
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING">Awaiting Reply</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) =>
            setPriorityFilter(e.target.value as TicketPriority | "ALL")
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="ALL">All Priority</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as TicketCategory | "ALL")
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="ALL">All Categories</option>
          <option value="GPS_DEVICE">GPS Device</option>
          <option value="CONNECTIVITY">Connectivity</option>
          <option value="INSTALLATION">Installation</option>
          <option value="BILLING">Billing</option>
          <option value="SOFTWARE">Software</option>
          <option value="GENERAL">General</option>
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

      {/* Tickets List */}
      {viewMode === "list" ? (
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
                      {ticket.ticketNumber}
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
                        {ticket.customer}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ticket.company}
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
                    {formatDate(ticket.updatedAt)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {ticket.comments.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {ticket.comments.length}
                        </span>
                      )}
                      <button onClick={() => setSelectedTicket(ticket)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filteredTickets.length === 0 && (
            <div className="py-12 text-center">
              <Ticket className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">No tickets found</p>
              <p className="text-xs text-slate-400">
                Try adjusting your filters
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
                  {ticket.ticketNumber}
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
                    {ticket.customer
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {ticket.customer}
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

              {ticket.comments.length > 0 && (
                <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {ticket.comments.length} comment
                  {ticket.comments.length !== 1 && "s"}
                  <span className="mx-1">·</span>
                  Updated {formatDate(ticket.updatedAt)}
                </div>
              )}
            </motion.div>
          ))}

          {filteredTickets.length === 0 && (
            <div className="col-span-2 py-12 text-center">
              <Ticket className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">No tickets found</p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateTicketModal onClose={() => setShowCreate(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
