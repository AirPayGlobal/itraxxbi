"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Users,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  User,
  Send,
  Sparkles,
  ListTodo,
  CalendarCheck,
  Target,
  Zap,
  X,
  Download,
  Copy,
  Check,
  MessageSquare,
  CircleDot,
  Loader2,
  Volume2,
  BarChart3,
  ArrowRight,
  History,
  Trash2,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  timestamp: number; // seconds from start
  confidence: number;
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  assignee: Employee | null;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
  status: "pending" | "assigned" | "completed";
  category: "task" | "decision" | "follow-up" | "blocker";
}

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar?: string;
}

interface MeetingSummary {
  title: string;
  duration: string;
  participants: string[];
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
}

interface PastMeeting {
  id: string;
  title: string;
  date: Date;
  duration: string;
  participants: string[];
  actionItemCount: number;
  transcript: TranscriptSegment[];
  summary: MeetingSummary;
}

type RecordingState = "idle" | "recording" | "paused" | "processing" | "complete";
type ViewTab = "recorder" | "history";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const EMPLOYEES: Employee[] = [
  { id: "1", name: "John Mutua", role: "Senior Technician", department: "Service" },
  { id: "2", name: "Sarah Kimani", role: "Operations Manager", department: "Operations" },
  { id: "3", name: "David Ochieng", role: "Fleet Manager", department: "Fleet" },
  { id: "4", name: "Grace Wanjiku", role: "HR Manager", department: "Human Resources" },
  { id: "5", name: "Peter Mwangi", role: "Finance Lead", department: "Finance" },
  { id: "6", name: "Amina Hassan", role: "Customer Relations", department: "Sales" },
  { id: "7", name: "James Kariuki", role: "Workshop Lead", department: "Service" },
  { id: "8", name: "Lucy Akinyi", role: "Parts Coordinator", department: "Inventory" },
  { id: "9", name: "Michael Otieno", role: "Quality Inspector", department: "Service" },
  { id: "10", name: "Faith Njeri", role: "Admin Assistant", department: "Operations" },
];

// Simulated transcript segments that arrive during "recording"
const SIMULATED_TRANSCRIPT: TranscriptSegment[] = [
  { id: "t1", speaker: "Sarah Kimani", text: "Good morning everyone. Let's kick off our weekly fleet operations review. First, I'd like to get an update on the maintenance backlog.", timestamp: 0, confidence: 0.96 },
  { id: "t2", speaker: "James Kariuki", text: "Thanks Sarah. We currently have 12 vehicles pending service. Five of those are priority — they've been waiting more than a week. The main bottleneck has been parts availability for the Toyota Hilux fleet.", timestamp: 8, confidence: 0.94 },
  { id: "t3", speaker: "Lucy Akinyi", text: "I can confirm that. The brake pad shipment was delayed, but I've received word it arrives tomorrow. I'll prioritize distribution to the workshop as soon as it's in.", timestamp: 18, confidence: 0.93 },
  { id: "t4", speaker: "Sarah Kimani", text: "Good. James, once parts arrive, how quickly can your team clear the backlog?", timestamp: 28, confidence: 0.97 },
  { id: "t5", speaker: "James Kariuki", text: "If we get the parts by midday tomorrow, we can have all five priority vehicles done by end of Thursday. I'll need to pull Michael in to help with the quality inspections.", timestamp: 34, confidence: 0.95 },
  { id: "t6", speaker: "Michael Otieno", text: "I'm available Thursday. I can do the inspections back-to-back if the servicing is completed by then.", timestamp: 43, confidence: 0.92 },
  { id: "t7", speaker: "David Ochieng", text: "That's critical because we have three client deliveries scheduled for Friday. Those vehicles must be road-ready. I'd also like to discuss the GPS tracking rollout.", timestamp: 50, confidence: 0.94 },
  { id: "t8", speaker: "Sarah Kimani", text: "Absolutely. David, give us the status on the GPS installation.", timestamp: 60, confidence: 0.96 },
  { id: "t9", speaker: "David Ochieng", text: "We've installed trackers on 28 of 45 fleet vehicles. The remaining 17 are scheduled over the next two weeks. John's team has been handling the hardware installation and they've been efficient.", timestamp: 65, confidence: 0.93 },
  { id: "t10", speaker: "John Mutua", text: "Yes, we're averaging about 3 installations per day. The main challenge is scheduling downtime with active vehicles. I'd recommend we do the remaining installations during the weekend maintenance windows.", timestamp: 76, confidence: 0.95 },
  { id: "t11", speaker: "Sarah Kimani", text: "Good suggestion. Let's formalize that as a plan. David, please coordinate with John on a weekend installation schedule.", timestamp: 87, confidence: 0.97 },
  { id: "t12", speaker: "Peter Mwangi", text: "On the finance side, I want to flag that we're running 15% over budget on maintenance this quarter. A lot of that is the unplanned repairs on the older fleet vehicles. We need to discuss whether it's more cost-effective to replace them.", timestamp: 93, confidence: 0.91 },
  { id: "t13", speaker: "Sarah Kimani", text: "That's a crucial point Peter. Can you prepare a cost analysis comparing repair vs replacement for the top 5 highest-cost vehicles? Let's review that in next week's meeting.", timestamp: 105, confidence: 0.96 },
  { id: "t14", speaker: "Peter Mwangi", text: "Will do. I'll have the report ready by next Monday.", timestamp: 115, confidence: 0.97 },
  { id: "t15", speaker: "Grace Wanjiku", text: "Before we wrap up, I need to mention that we're short-staffed in the workshop next week. Two technicians are on approved leave. James, you may want to plan around that.", timestamp: 120, confidence: 0.94 },
  { id: "t16", speaker: "James Kariuki", text: "Thanks for the heads up Grace. I'll adjust the work schedule and prioritize the urgent jobs accordingly.", timestamp: 130, confidence: 0.93 },
  { id: "t17", speaker: "Amina Hassan", text: "One last thing — I've had three customer complaints about delayed vehicle deliveries this month. We need to improve our communication with clients about realistic timelines. Can we set up an automated notification system?", timestamp: 137, confidence: 0.95 },
  { id: "t18", speaker: "Sarah Kimani", text: "Good point Amina. Let's have you work with the tech team to spec out an automated customer notification system. Draft a proposal by next Wednesday.", timestamp: 148, confidence: 0.96 },
  { id: "t19", speaker: "Sarah Kimani", text: "Alright, great meeting everyone. Let me summarize the key action items: Lucy handles parts distribution, James clears the maintenance backlog by Thursday, Michael does inspections Thursday, David and John coordinate GPS installations for weekends, Peter prepares the cost analysis, James adjusts for staff shortage, and Amina drafts the notification proposal. Let's reconvene next Monday. Thank you all.", timestamp: 155, confidence: 0.98 },
];

const PAST_MEETINGS: PastMeeting[] = [
  {
    id: "pm1",
    title: "Q4 Budget Planning Review",
    date: new Date(2026, 1, 24, 10, 0),
    duration: "45 min",
    participants: ["Sarah Kimani", "Peter Mwangi", "Grace Wanjiku", "David Ochieng"],
    actionItemCount: 6,
    transcript: [],
    summary: {
      title: "Q4 Budget Planning Review",
      duration: "45 min",
      participants: ["Sarah Kimani", "Peter Mwangi", "Grace Wanjiku", "David Ochieng"],
      keyPoints: [
        "Current spend is tracking 8% under budget for Q3",
        "Fleet expansion requires additional capital allocation",
        "Staff training budget needs reallocation from travel",
      ],
      decisions: [
        "Approved fleet expansion budget of $120K for Q4",
        "Deferred new software procurement to Q1 next year",
      ],
      actionItems: [],
    },
  },
  {
    id: "pm2",
    title: "Workshop Safety Audit Debrief",
    date: new Date(2026, 1, 20, 14, 30),
    duration: "30 min",
    participants: ["James Kariuki", "Michael Otieno", "John Mutua", "Grace Wanjiku"],
    actionItemCount: 4,
    transcript: [],
    summary: {
      title: "Workshop Safety Audit Debrief",
      duration: "30 min",
      participants: ["James Kariuki", "Michael Otieno", "John Mutua", "Grace Wanjiku"],
      keyPoints: [
        "Safety audit scored 87/100 — improvement from last quarter",
        "Two non-conformances identified in chemical storage",
        "PPE compliance has improved significantly",
      ],
      decisions: [
        "Implement new chemical storage protocol immediately",
        "Schedule follow-up audit in 6 weeks",
      ],
      actionItems: [],
    },
  },
  {
    id: "pm3",
    title: "Customer Retention Strategy",
    date: new Date(2026, 1, 17, 9, 0),
    duration: "1h 10 min",
    participants: ["Amina Hassan", "Sarah Kimani", "Peter Mwangi", "Faith Njeri"],
    actionItemCount: 8,
    transcript: [],
    summary: {
      title: "Customer Retention Strategy",
      duration: "1h 10 min",
      participants: ["Amina Hassan", "Sarah Kimani", "Peter Mwangi", "Faith Njeri"],
      keyPoints: [
        "Customer churn rate increased 3% last quarter",
        "Top reasons: delayed service, poor communication, pricing",
        "Loyalty program showing positive early results",
      ],
      decisions: [
        "Expand loyalty program to all service tiers",
        "Implement 24-hour response SLA for complaints",
      ],
      actionItems: [],
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getCategoryColor(cat: ActionItem["category"]): string {
  switch (cat) {
    case "task": return "bg-blue-100 text-blue-700 border-blue-200";
    case "decision": return "bg-purple-100 text-purple-700 border-purple-200";
    case "follow-up": return "bg-amber-100 text-amber-700 border-amber-200";
    case "blocker": return "bg-red-100 text-red-700 border-red-200";
  }
}

function getCategoryIcon(cat: ActionItem["category"]) {
  switch (cat) {
    case "task": return <ListTodo className="h-3.5 w-3.5" />;
    case "decision": return <Target className="h-3.5 w-3.5" />;
    case "follow-up": return <CalendarCheck className="h-3.5 w-3.5" />;
    case "blocker": return <AlertTriangle className="h-3.5 w-3.5" />;
  }
}

function getPriorityStyles(p: ActionItem["priority"]): string {
  switch (p) {
    case "low": return "bg-slate-100 text-slate-600";
    case "medium": return "bg-blue-100 text-blue-700";
    case "high": return "bg-orange-100 text-orange-700";
    case "urgent": return "bg-red-100 text-red-700";
  }
}

// ---------------------------------------------------------------------------
// Audio Visualizer Component
// ---------------------------------------------------------------------------

function AudioVisualizer({ isActive, isPaused }: { isActive: boolean; isPaused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const barCount = 48;
    const barWidth = 4;
    const gap = 3;
    canvas.width = barCount * (barWidth + gap);
    canvas.height = 80;

    const bars = Array.from({ length: barCount }, () => Math.random() * 20 + 5);

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < barCount; i++) {
        if (isActive && !isPaused) {
          bars[i] += (Math.random() - 0.5) * 12;
          bars[i] = Math.max(4, Math.min(canvas.height - 4, bars[i]));
        } else {
          bars[i] += (8 - bars[i]) * 0.08;
        }

        const x = i * (barWidth + gap);
        const h = bars[i];
        const y = (canvas.height - h) / 2;

        const gradient = ctx.createLinearGradient(x, y, x, y + h);
        if (isActive && !isPaused) {
          gradient.addColorStop(0, "#3b82f6");
          gradient.addColorStop(0.5, "#6366f1");
          gradient.addColorStop(1, "#8b5cf6");
        } else {
          gradient.addColorStop(0, "#64748b");
          gradient.addColorStop(1, "#94a3b8");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isActive, isPaused]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-sm h-20 mx-auto"
      style={{ imageRendering: "auto" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Speaker Avatar Component
// ---------------------------------------------------------------------------

function SpeakerAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500",
  ];
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const dims = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  return (
    <div className={cn("flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0", colors[idx], dims)}>
      {getInitials(name)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Employee Picker Component
// ---------------------------------------------------------------------------

function EmployeePicker({
  selected,
  onSelect,
  onClose,
}: {
  selected: Employee | null;
  onSelect: (e: Employee) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = EMPLOYEES.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
    >
      <div className="p-2 border-b border-slate-100">
        <input
          type="text"
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>
      <div className="max-h-48 overflow-y-auto p-1">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 px-3 py-4 text-center">No employees found</p>
        )}
        {filtered.map((emp) => (
          <button
            key={emp.id}
            onClick={() => { onSelect(emp); onClose(); }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50",
              selected?.id === emp.id && "bg-blue-50 ring-1 ring-blue-200"
            )}
          >
            <SpeakerAvatar name={emp.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate">{emp.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{emp.role} &middot; {emp.department}</p>
            </div>
            {selected?.id === emp.id && <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Action Item Card Component
// ---------------------------------------------------------------------------

function ActionItemCard({
  item,
  onAssign,
  onRemove,
}: {
  item: ActionItem;
  onAssign: (emp: Employee) => void;
  onRemove: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 flex items-center justify-center rounded-lg p-1.5 border", getCategoryColor(item.category))}>
          {getCategoryIcon(item.category)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-800">{item.title}</h4>
            <button onClick={onRemove} className="text-slate-300 hover:text-red-400 transition-colors p-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>

          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", getCategoryColor(item.category))}>
              {item.category}
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", getPriorityStyles(item.priority))}>
              {item.priority}
            </span>
            {item.dueDate && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="h-3 w-3" /> {item.dueDate}
              </span>
            )}
          </div>

          {/* Assignee Section */}
          <div className="mt-3 relative">
            {item.assignee ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5">
                <SpeakerAvatar name={item.assignee.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-800">{item.assignee.name}</p>
                  <p className="text-[10px] text-green-600">{item.assignee.role}</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            ) : (
              <button
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all w-full"
              >
                <User className="h-3.5 w-3.5" />
                <span>Assign to employee...</span>
              </button>
            )}
            <AnimatePresence>
              {showPicker && (
                <EmployeePicker
                  selected={item.assignee}
                  onSelect={onAssign}
                  onClose={() => setShowPicker(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Past Meeting Card
// ---------------------------------------------------------------------------

function PastMeetingCard({ meeting, onView }: { meeting: PastMeeting; onView: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onView}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{meeting.title}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {meeting.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            {" "}at{" "}
            {meeting.date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            {" "}&middot;{" "}{meeting.duration}
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-3 mt-3">
        <div className="flex -space-x-2">
          {meeting.participants.slice(0, 4).map((p) => (
            <SpeakerAvatar key={p} name={p} size="sm" />
          ))}
          {meeting.participants.length > 4 && (
            <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-600 border-2 border-white">
              +{meeting.participants.length - 4}
            </div>
          )}
        </div>
        <span className="text-xs text-slate-400">{meeting.participants.length} participants</span>
        <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
          <ListTodo className="h-3 w-3" /> {meeting.actionItemCount} action items
        </span>
      </div>

      {/* Key points preview */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {meeting.summary.decisions.slice(0, 2).map((d, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] text-purple-700 border border-purple-100">
            <Target className="h-3 w-3" /> {d.length > 40 ? d.slice(0, 40) + "..." : d}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function MeetingAIPage() {
  // State
  const [activeTab, setActiveTab] = useState<ViewTab>("recorder");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [showActions, setShowActions] = useState(true);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [selectedPastMeeting, setSelectedPastMeeting] = useState<PastMeeting | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("Weekly Fleet Operations Review");

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Timer logic
  useEffect(() => {
    if (recordingState === "recording") {
      timerRef.current = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recordingState]);

  // Simulated transcript streaming
  useEffect(() => {
    if (recordingState === "recording") {
      let segmentIdx = transcript.length;
      transcriptTimerRef.current = setInterval(() => {
        if (segmentIdx < SIMULATED_TRANSCRIPT.length) {
          setTranscript((prev) => [...prev, SIMULATED_TRANSCRIPT[segmentIdx]]);
          segmentIdx++;
        }
      }, 3500);
    } else {
      if (transcriptTimerRef.current) clearInterval(transcriptTimerRef.current);
    }
    return () => { if (transcriptTimerRef.current) clearInterval(transcriptTimerRef.current); };
  }, [recordingState, transcript.length]);

  // Start recording
  const handleStartRecording = useCallback(() => {
    setRecordingState("recording");
    setElapsedTime(0);
    setTranscript([]);
    setActionItems([]);
    setSummary(null);
    setProcessingProgress(0);
  }, []);

  // Pause/resume
  const handleTogglePause = useCallback(() => {
    setRecordingState((s) => (s === "paused" ? "recording" : "paused"));
  }, []);

  // Stop recording — trigger AI processing
  const handleStopRecording = useCallback(() => {
    setRecordingState("processing");

    // Simulated processing with progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(progressInterval);

        // Fill remaining transcript
        setTranscript(SIMULATED_TRANSCRIPT);

        // Generate AI action items
        const generatedItems: ActionItem[] = [
          {
            id: generateId(),
            title: "Distribute brake pad shipment to workshop",
            description: "Prioritize distribution of incoming brake pad shipment to the workshop immediately upon arrival tomorrow.",
            assignee: EMPLOYEES.find((e) => e.name === "Lucy Akinyi") || null,
            priority: "high",
            dueDate: "Tomorrow, midday",
            status: EMPLOYEES.find((e) => e.name === "Lucy Akinyi") ? "assigned" : "pending",
            category: "task",
          },
          {
            id: generateId(),
            title: "Clear 5 priority vehicle maintenance backlog",
            description: "Complete servicing on all 5 priority vehicles that have been waiting over a week. Requires brake parts from Lucy.",
            assignee: EMPLOYEES.find((e) => e.name === "James Kariuki") || null,
            priority: "urgent",
            dueDate: "End of Thursday",
            status: "assigned",
            category: "task",
          },
          {
            id: generateId(),
            title: "Quality inspections on serviced vehicles",
            description: "Perform back-to-back quality inspections on all priority vehicles once servicing is completed Thursday.",
            assignee: EMPLOYEES.find((e) => e.name === "Michael Otieno") || null,
            priority: "high",
            dueDate: "Thursday",
            status: "assigned",
            category: "task",
          },
          {
            id: generateId(),
            title: "Coordinate weekend GPS installation schedule",
            description: "Work with John Mutua to create a weekend installation schedule for remaining 17 fleet vehicles needing GPS trackers.",
            assignee: EMPLOYEES.find((e) => e.name === "David Ochieng") || null,
            priority: "medium",
            dueDate: "This week",
            status: "assigned",
            category: "follow-up",
          },
          {
            id: generateId(),
            title: "Prepare repair vs replacement cost analysis",
            description: "Create detailed cost analysis comparing ongoing repair costs vs replacement for the top 5 highest-maintenance vehicles.",
            assignee: EMPLOYEES.find((e) => e.name === "Peter Mwangi") || null,
            priority: "high",
            dueDate: "Next Monday",
            status: "assigned",
            category: "task",
          },
          {
            id: generateId(),
            title: "Adjust workshop schedule for staff shortage",
            description: "Reorganize next week's workshop schedule to account for two technicians on approved leave. Prioritize urgent jobs.",
            assignee: EMPLOYEES.find((e) => e.name === "James Kariuki") || null,
            priority: "medium",
            dueDate: "Before weekend",
            status: "assigned",
            category: "task",
          },
          {
            id: generateId(),
            title: "Draft automated customer notification system proposal",
            description: "Spec out an automated notification system to improve customer communication about vehicle delivery timelines.",
            assignee: EMPLOYEES.find((e) => e.name === "Amina Hassan") || null,
            priority: "medium",
            dueDate: "Next Wednesday",
            status: "assigned",
            category: "follow-up",
          },
          {
            id: generateId(),
            title: "Decision: GPS installations during weekend maintenance windows",
            description: "Approved plan to conduct remaining GPS tracker installations during scheduled weekend maintenance downtime periods.",
            assignee: null,
            priority: "low",
            dueDate: "",
            status: "pending",
            category: "decision",
          },
          {
            id: generateId(),
            title: "Blocker: Parts availability for Toyota Hilux fleet",
            description: "Brake pad shipment delay is blocking priority maintenance. Arriving tomorrow — monitor delivery status.",
            assignee: EMPLOYEES.find((e) => e.name === "Lucy Akinyi") || null,
            priority: "urgent",
            dueDate: "Tomorrow",
            status: "assigned",
            category: "blocker",
          },
        ];

        setActionItems(generatedItems);

        // Generate summary
        setSummary({
          title: meetingTitle,
          duration: formatRecordingTime(elapsedTime),
          participants: [...new Set(SIMULATED_TRANSCRIPT.map((t) => t.speaker))],
          keyPoints: [
            "12 vehicles pending service, 5 are priority (waiting 1+ week)",
            "Brake pad shipment arriving tomorrow — main bottleneck",
            "GPS trackers installed on 28/45 fleet vehicles",
            "Maintenance budget 15% over for the quarter",
            "Two technicians on leave next week — workshop short-staffed",
            "Three customer complaints about delayed deliveries this month",
          ],
          decisions: [
            "GPS installations to be done during weekend maintenance windows",
            "Cost analysis for vehicle repair vs replacement to be reviewed next week",
          ],
          actionItems: generatedItems,
        });

        setRecordingState("complete");
      }
      setProcessingProgress(Math.min(100, progress));
    }, 400);
  }, [meetingTitle, elapsedTime]);

  // Reset for new meeting
  const handleNewMeeting = useCallback(() => {
    setRecordingState("idle");
    setElapsedTime(0);
    setTranscript([]);
    setActionItems([]);
    setSummary(null);
    setProcessingProgress(0);
    setMeetingTitle("Weekly Fleet Operations Review");
  }, []);

  // Assign employee to action item
  const handleAssign = useCallback((itemId: string, employee: Employee) => {
    setActionItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, assignee: employee, status: "assigned" } : item
      )
    );
  }, []);

  // Remove action item
  const handleRemoveItem = useCallback((itemId: string) => {
    setActionItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  // Copy transcript
  const handleCopyTranscript = useCallback(() => {
    const text = transcript.map((s) => `[${formatRecordingTime(s.timestamp)}] ${s.speaker}: ${s.text}`).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [transcript]);

  // Send all action items (simulated)
  const handleSendAll = useCallback(() => {
    setActionItems((prev) =>
      prev.map((item) => (item.assignee ? { ...item, status: "assigned" } : item))
    );
  }, []);

  const assignedCount = actionItems.filter((i) => i.assignee).length;
  const totalItems = actionItems.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Meeting AI</h1>
                <p className="text-xs text-slate-500">Record, transcribe, and extract action items automatically</p>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => { setActiveTab("recorder"); setSelectedPastMeeting(null); }}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  activeTab === "recorder" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Mic className="h-4 w-4" /> Recorder
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  activeTab === "history" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <History className="h-4 w-4" /> History
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {/* ============================================================= */}
          {/* RECORDER TAB */}
          {/* ============================================================= */}
          {activeTab === "recorder" && (
            <motion.div
              key="recorder"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              {/* Meeting Title Input */}
              {recordingState === "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Meeting Title</label>
                  <input
                    type="text"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Enter meeting title..."
                    className="w-full max-w-lg rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm"
                  />
                </motion.div>
              )}

              {/* Recording Control Panel */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
                <div className="p-6">
                  {/* Status Badge */}
                  <div className="flex items-center justify-center mb-4">
                    <span className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium",
                      recordingState === "idle" && "bg-slate-100 text-slate-600",
                      recordingState === "recording" && "bg-red-100 text-red-700",
                      recordingState === "paused" && "bg-amber-100 text-amber-700",
                      recordingState === "processing" && "bg-violet-100 text-violet-700",
                      recordingState === "complete" && "bg-green-100 text-green-700",
                    )}>
                      {recordingState === "idle" && <><Mic className="h-4 w-4" /> Ready to Record</>}
                      {recordingState === "recording" && <><CircleDot className="h-4 w-4 animate-pulse" /> Recording</>}
                      {recordingState === "paused" && <><Pause className="h-4 w-4" /> Paused</>}
                      {recordingState === "processing" && <><Loader2 className="h-4 w-4 animate-spin" /> AI Processing...</>}
                      {recordingState === "complete" && <><CheckCircle2 className="h-4 w-4" /> Meeting Processed</>}
                    </span>
                  </div>

                  {/* Timer */}
                  {(recordingState === "recording" || recordingState === "paused" || recordingState === "processing") && (
                    <div className="text-center mb-4">
                      <p className="text-4xl font-mono font-bold text-slate-800">{formatRecordingTime(elapsedTime)}</p>
                    </div>
                  )}

                  {/* Audio Visualization */}
                  {(recordingState === "recording" || recordingState === "paused") && (
                    <div className="mb-6">
                      <AudioVisualizer isActive={recordingState === "recording"} isPaused={recordingState === "paused"} />
                    </div>
                  )}

                  {/* Processing Progress */}
                  {recordingState === "processing" && (
                    <div className="mb-6 max-w-md mx-auto">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span>Analyzing meeting content...</span>
                        <span>{Math.round(processingProgress)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${processingProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <div className="flex items-center gap-6 justify-center mt-4 text-xs text-slate-500">
                        <span className={processingProgress > 20 ? "text-green-600 font-medium" : ""}>
                          <CheckCircle2 className="h-3 w-3 inline mr-1" />Transcription
                        </span>
                        <span className={processingProgress > 50 ? "text-green-600 font-medium" : ""}>
                          <Sparkles className="h-3 w-3 inline mr-1" />Analysis
                        </span>
                        <span className={processingProgress > 80 ? "text-green-600 font-medium" : ""}>
                          <ListTodo className="h-3 w-3 inline mr-1" />Action Items
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4">
                    {recordingState === "idle" && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStartRecording}
                        className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 px-8 py-4 text-white font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-shadow"
                      >
                        <Mic className="h-5 w-5" />
                        Start Recording
                      </motion.button>
                    )}

                    {(recordingState === "recording" || recordingState === "paused") && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleTogglePause}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-5 py-3 font-medium shadow-sm transition-all",
                            recordingState === "paused"
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          )}
                        >
                          {recordingState === "paused" ? (
                            <><Play className="h-4 w-4" /> Resume</>
                          ) : (
                            <><Pause className="h-4 w-4" /> Pause</>
                          )}
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleStopRecording}
                          className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 text-white font-medium shadow-sm hover:bg-slate-900 transition-colors"
                        >
                          <Square className="h-4 w-4" /> Stop & Process
                        </motion.button>
                      </>
                    )}

                    {recordingState === "complete" && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleNewMeeting}
                        className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-white font-medium shadow-sm hover:bg-violet-700 transition-colors"
                      >
                        <Mic className="h-4 w-4" /> New Meeting
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>

              {/* Two-Column Layout for Transcript + Action Items */}
              {(recordingState !== "idle" && recordingState !== "processing") && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Transcript */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <h2 className="font-semibold text-slate-800 text-sm">Live Transcript</h2>
                        <span className="text-xs text-slate-400">({transcript.length} segments)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {transcript.length > 0 && (
                          <button
                            onClick={handleCopyTranscript}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
                          >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? "Copied" : "Copy"}
                          </button>
                        )}
                        {recordingState === "recording" && (
                          <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            Live
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-[500px] overflow-y-auto p-4 space-y-3">
                      {transcript.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <Volume2 className="h-10 w-10 text-slate-300 mb-3" />
                          <p className="text-sm text-slate-500">Waiting for speech...</p>
                          <p className="text-xs text-slate-400 mt-1">Transcript will appear here as people speak</p>
                        </div>
                      )}

                      <AnimatePresence initial={false}>
                        {transcript.map((seg) => (
                          <motion.div
                            key={seg.id}
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="flex gap-3"
                          >
                            <SpeakerAvatar name={seg.speaker} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-700">{seg.speaker}</span>
                                <span className="text-[10px] text-slate-400">{formatRecordingTime(seg.timestamp)}</span>
                              </div>
                              <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{seg.text}</p>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <div ref={transcriptEndRef} />
                    </div>
                  </div>

                  {/* Right: Action Items + Summary */}
                  <div className="space-y-6">
                    {/* AI Summary */}
                    {summary && (
                      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <button
                          onClick={() => setShowSummary(!showSummary)}
                          className="flex items-center justify-between w-full border-b border-slate-100 px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-violet-500" />
                            <h2 className="font-semibold text-slate-800 text-sm">AI Summary</h2>
                          </div>
                          {showSummary ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </button>

                        <AnimatePresence>
                          {showSummary && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-5 space-y-4">
                                {/* Meeting Info */}
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {summary.duration || formatRecordingTime(elapsedTime)}</span>
                                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {summary.participants.length} participants</span>
                                </div>

                                {/* Participants */}
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Participants</h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {summary.participants.map((p) => (
                                      <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                                        <SpeakerAvatar name={p} size="sm" />
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Key Points */}
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Key Points</h4>
                                  <ul className="space-y-1.5">
                                    {summary.keyPoints.map((kp, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                                        {kp}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Decisions */}
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Key Decisions</h4>
                                  <div className="space-y-1.5">
                                    {summary.decisions.map((d, i) => (
                                      <div key={i} className="flex items-start gap-2 rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 text-sm text-purple-800">
                                        <Target className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                        {d}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Action Items */}
                    {actionItems.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <button
                          onClick={() => setShowActions(!showActions)}
                          className="flex items-center justify-between w-full border-b border-slate-100 px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ListTodo className="h-4 w-4 text-blue-500" />
                            <h2 className="font-semibold text-slate-800 text-sm">Action Items</h2>
                            <span className="text-xs text-slate-400">
                              ({assignedCount}/{totalItems} assigned)
                            </span>
                          </div>
                          {showActions ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        </button>

                        <AnimatePresence>
                          {showActions && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                                <AnimatePresence>
                                  {actionItems.map((item) => (
                                    <ActionItemCard
                                      key={item.id}
                                      item={item}
                                      onAssign={(emp) => handleAssign(item.id, emp)}
                                      onRemove={() => handleRemoveItem(item.id)}
                                    />
                                  ))}
                                </AnimatePresence>
                              </div>

                              {/* Footer Actions */}
                              <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-24 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-green-500 transition-all duration-500"
                                      style={{ width: `${totalItems > 0 ? (assignedCount / totalItems) * 100 : 0}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-500">{assignedCount} of {totalItems} assigned</span>
                                </div>
                                <button
                                  onClick={handleSendAll}
                                  disabled={assignedCount === 0}
                                  className={cn(
                                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                                    assignedCount > 0
                                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                  )}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Send All Tasks
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Placeholder when recording but no items yet */}
                    {actionItems.length === 0 && recordingState !== "complete" && (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-8 text-center">
                        <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-500">AI will extract action items</p>
                        <p className="text-xs text-slate-400 mt-1">Stop the recording to process and generate tasks</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Idle State Hero */}
              {recordingState === "idle" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center mb-3">
                      <Mic className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">Record Meeting</h3>
                    <p className="text-xs text-slate-500 mt-1.5">Capture audio from your meeting with a single click. Pause and resume as needed.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-violet-600" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">AI Transcription</h3>
                    <p className="text-xs text-slate-500 mt-1.5">Real-time speech-to-text with speaker identification and confidence scoring.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                      <ListTodo className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">Extract Action Items</h3>
                    <p className="text-xs text-slate-500 mt-1.5">AI identifies tasks, decisions, and follow-ups — then assigns them to your team.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ============================================================= */}
          {/* HISTORY TAB */}
          {/* ============================================================= */}
          {activeTab === "history" && !selectedPastMeeting && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Meeting History</h2>
                  <p className="text-sm text-slate-500">View past meetings and their outcomes</p>
                </div>
                <span className="text-sm text-slate-400">{PAST_MEETINGS.length} meetings</span>
              </div>

              <div className="space-y-4">
                {PAST_MEETINGS.map((meeting) => (
                  <PastMeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onView={() => setSelectedPastMeeting(meeting)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================================================= */}
          {/* PAST MEETING DETAIL VIEW */}
          {/* ============================================================= */}
          {activeTab === "history" && selectedPastMeeting && (
            <motion.div
              key="meeting-detail"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              {/* Back Button */}
              <button
                onClick={() => setSelectedPastMeeting(null)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
              >
                <ChevronDown className="h-4 w-4 rotate-90" /> Back to History
              </button>

              {/* Meeting Header */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-6">
                <h2 className="text-xl font-bold text-slate-800">{selectedPastMeeting.title}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CalendarCheck className="h-4 w-4" />
                    {selectedPastMeeting.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> {selectedPastMeeting.duration}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> {selectedPastMeeting.participants.length} participants
                  </span>
                </div>

                {/* Participants */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedPastMeeting.participants.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                      <SpeakerAvatar name={p} size="sm" /> {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Summary Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Key Points */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-amber-500" /> Key Points
                  </h3>
                  <ul className="space-y-2">
                    {selectedPastMeeting.summary.keyPoints.map((kp, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        {kp}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Decisions */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-purple-500" /> Key Decisions
                  </h3>
                  <div className="space-y-2">
                    {selectedPastMeeting.summary.decisions.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-purple-50 border border-purple-100 px-3 py-2.5 text-sm text-purple-800">
                        <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{selectedPastMeeting.actionItemCount}</p>
                  <p className="text-xs text-slate-500 mt-1">Action Items</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{selectedPastMeeting.summary.decisions.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Decisions Made</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{selectedPastMeeting.participants.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Participants</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
