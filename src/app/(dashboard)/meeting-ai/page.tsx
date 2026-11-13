"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useSyncExternalStore } from "react";
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
  ChevronDown,
  ChevronUp,
  Sparkles,
  ListTodo,
  CalendarCheck,
  Zap,
  X,
  Copy,
  Check,
  MessageSquare,
  CircleDot,
  Loader2,
  Volume2,
  ArrowRight,
  History,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  Keyboard,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn, getInitials, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/components/providers/session-provider";
import {
  useMeetings,
  useStaff,
  useCreateMeeting,
  useCreateMeetingTasks,
  useDeleteMeeting,
  extractMeeting,
  type Meeting,
  type MeetingActionItem,
  type MeetingParticipant,
  type StaffMember,
  type TranscriptEntry,
} from "@/lib/hooks/use-meetings";
import { formatDueKey } from "@/lib/traxx-answers";

// ---------------------------------------------------------------------------
// Web Speech API (not in the TS DOM lib everywhere, so typed minimally here)
// ---------------------------------------------------------------------------

type SpeechAlternative = { transcript: string };
type SpeechResult = { isFinal: boolean; length: number; [i: number]: SpeechAlternative };
type SpeechResultEvent = { resultIndex: number; results: { length: number; [i: number]: SpeechResult } };
type SpeechErrorEvent = { error: string };
type SpeechRecognizer = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognizerCtor = new () => SpeechRecognizer;

function getSpeechCtor(): SpeechRecognizerCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognizerCtor;
    webkitSpeechRecognition?: SpeechRecognizerCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};
function useSpeechSupported(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => getSpeechCtor() !== null,
    () => false
  );
}

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type Segment = TranscriptEntry & { id: string };
type Phase = "idle" | "capturing" | "paused" | "review";
type ViewTab = "recorder" | "history";
type Draft = { summary: string; key_points: string[]; action_items: MeetingActionItem[] };

const DEFAULT_TITLE = "Team meeting";

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60} min`;
}

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `seg-${Date.now()}-${idCounter}`;
}

// ---------------------------------------------------------------------------
// Audio Visualizer (decorative; animates while capture is running)
// ---------------------------------------------------------------------------

function AudioVisualizer({ isActive }: { isActive: boolean }) {
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
    const bars = Array.from({ length: barCount }, () => 8);

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < barCount; i++) {
        if (isActive) {
          bars[i] += (Math.random() - 0.5) * 12;
          bars[i] = Math.max(4, Math.min(canvas.height - 4, bars[i]));
        } else {
          bars[i] += (8 - bars[i]) * 0.08;
        }
        const x = i * (barWidth + gap);
        const h = bars[i];
        const y = (canvas.height - h) / 2;
        const gradient = ctx.createLinearGradient(x, y, x, y + h);
        if (isActive) {
          gradient.addColorStop(0, "#1e8fe0");
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
  }, [isActive]);

  return <canvas ref={canvasRef} className="w-full max-w-sm h-20 mx-auto" />;
}

// ---------------------------------------------------------------------------
// Small components
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
      {getInitials(name || "?")}
    </div>
  );
}

function StaffPicker({
  staff,
  excludeIds,
  onSelect,
  onClose,
}: {
  staff: StaffMember[];
  excludeIds: string[];
  onSelect: (s: StaffMember) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();
  const filtered = staff.filter(
    (e) =>
      !excludeIds.includes(e.id) &&
      (e.name.toLowerCase().includes(q) ||
        (e.job_title ?? "").toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      className="absolute left-0 top-full mt-1 z-50 w-72 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
    >
      <div className="p-2 border-b border-slate-100 flex items-center gap-2">
        <input
          type="text"
          placeholder="Search staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          autoFocus
        />
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto p-1">
        {filtered.length === 0 && <p className="text-xs text-slate-400 px-3 py-4 text-center">No staff found</p>}
        {filtered.map((emp) => (
          <button
            key={emp.id}
            onClick={() => {
              onSelect(emp);
              onClose();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
          >
            <SpeakerAvatar name={emp.name} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate">{emp.name}</p>
              <p className="text-[11px] text-slate-500 truncate">
                {[emp.job_title, emp.department].filter(Boolean).join(" · ") || emp.role.toLowerCase()}
              </p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function SectionCard({
  icon,
  title,
  extra,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  extra?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full border-b border-slate-100 px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
          {extra}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PastMeetingCard({ meeting, onView }: { meeting: Meeting; onView: () => void }) {
  const date = new Date(meeting.meeting_date);
  const names = meeting.participants.map((p) => p.name);
  const openItems = meeting.action_items.filter((a) => !a.task_id).length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onView}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 group-hover:text-violet-600 transition-colors">{meeting.title}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} at{" "}
            {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} &middot;{" "}
            {formatDuration(meeting.duration_seconds)}
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-violet-500 transition-colors flex-shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <div className="flex -space-x-2">
          {names.slice(0, 4).map((p, i) => (
            <SpeakerAvatar key={`${p}-${i}`} name={p} />
          ))}
          {names.length > 4 && (
            <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-600 border-2 border-white">
              +{names.length - 4}
            </div>
          )}
        </div>
        <span className="text-xs text-slate-400">
          {names.length} participant{names.length === 1 ? "" : "s"}
        </span>
        <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
          <ListTodo className="h-3 w-3" /> {meeting.action_items.length} action items
          {openItems > 0 && meeting.action_items.length > 0 && ` (${openItems} without task)`}
        </span>
      </div>

      {meeting.summary && <p className="mt-3 text-xs text-slate-500 line-clamp-2">{meeting.summary}</p>}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MeetingAIPage() {
  const { profile } = useAuth();
  const { data: staff = [], isLoading: staffLoading } = useStaff();
  const { data: meetings = [], isLoading: meetingsLoading, error: meetingsError } = useMeetings();
  const createMeeting = useCreateMeeting();
  const createTasks = useCreateMeetingTasks();
  const deleteMeeting = useDeleteMeeting();
  const speechSupported = useSpeechSupported();

  const isViewer = profile?.role === "VIEWER";
  const isManager = profile?.role === "ADMIN" || profile?.role === "MANAGER";

  // --- State ---
  const [activeTab, setActiveTab] = useState<ViewTab>("recorder");
  const [phase, setPhase] = useState<Phase>("idle");
  const [meetingTitle, setMeetingTitle] = useState(DEFAULT_TITLE);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [showParticipantPicker, setShowParticipantPicker] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speaker, setSpeaker] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [alsoCreateTasks, setAlsoCreateTasks] = useState(true);
  const [showSummary, setShowSummary] = useState(true);
  const [showActions, setShowActions] = useState(true);
  const [showKeyPoints, setShowKeyPoints] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [showDetailTranscript, setShowDetailTranscript] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognizer | null>(null);
  const wantListeningRef = useRef(false);
  const speakerRef = useRef("");
  const clockRef = useRef<{ acc: number; since: number | null }>({ acc: 0, since: null });

  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const participants: MeetingParticipant[] = useMemo(
    () =>
      participantIds
        .map((id) => staffById.get(id))
        .filter((s): s is StaffMember => !!s)
        .map((s) => ({ id: s.id, name: s.name })),
    [participantIds, staffById]
  );
  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId) ?? null;
  const activeSpeaker = speaker || profile?.name || "Speaker";

  const currentSeconds = useCallback(() => {
    const c = clockRef.current;
    return Math.floor((c.acc + (c.since !== null ? Date.now() - c.since : 0)) / 1000);
  }, []);

  // --- Effects ---
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [segments, interim]);

  useEffect(() => {
    if (phase !== "capturing") return;
    const t = setInterval(() => setElapsed(currentSeconds()), 500);
    return () => clearInterval(t);
  }, [phase, currentSeconds]);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  // --- Transcript capture ---
  const addSegment = useCallback(
    (text: string, who?: string) => {
      const clean = text.trim();
      if (!clean) return;
      setSegments((prev) => [
        ...prev,
        { id: generateId(), speaker: who || speakerRef.current || "Speaker", text: clean, at: currentSeconds() },
      ]);
    },
    [currentSeconds]
  );

  const startListening = useCallback(() => {
    const Ctor = getSpeechCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const said = r[0]?.transcript ?? "";
        if (r.isFinal) addSegment(said);
        else interimText += said;
      }
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
        wantListeningRef.current = false;
        setSpeechError("Microphone unavailable or permission denied. Type or paste notes below instead.");
      }
    };
    rec.onend = () => {
      // Browsers end recognition after silence; restart while capture is on.
      if (recognitionRef.current !== rec) return; // superseded by a newer recognizer
      if (wantListeningRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through */
        }
      }
      setListening(false);
      setInterim("");
    };
    recognitionRef.current = rec;
    wantListeningRef.current = true;
    setSpeechError(null);
    try {
      rec.start();
      setListening(true);
    } catch {
      wantListeningRef.current = false;
      setSpeechError("Could not start speech recognition. Type or paste notes below instead.");
    }
  }, [addSegment]);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const handleStart = useCallback(() => {
    if (!meetingTitle.trim()) {
      toast.error("Give the meeting a title first");
      return;
    }
    if (profile && !participantIds.includes(profile.id) && staffById.has(profile.id)) {
      setParticipantIds((prev) => [profile.id, ...prev]);
    }
    speakerRef.current = activeSpeaker;
    setSpeaker(activeSpeaker);
    clockRef.current = { acc: 0, since: Date.now() };
    setStartedAt(new Date());
    setElapsed(0);
    setSegments([]);
    setInterim("");
    setDraft(null);
    setPhase("capturing");
    if (speechSupported) startListening();
  }, [meetingTitle, profile, participantIds, staffById, activeSpeaker, speechSupported, startListening]);

  const handleTogglePause = useCallback(() => {
    const c = clockRef.current;
    if (phase === "capturing") {
      if (c.since !== null) c.acc += Date.now() - c.since;
      c.since = null;
      stopListening();
      if (interim.trim()) addSegment(interim);
      setInterim("");
      setElapsed(currentSeconds());
      setPhase("paused");
    } else if (phase === "paused") {
      c.since = Date.now();
      setPhase("capturing");
      if (speechSupported) startListening();
    }
  }, [phase, stopListening, interim, addSegment, currentSeconds, speechSupported, startListening]);

  const buildDraft = useCallback(
    (segs: Segment[], seconds: number) =>
      extractMeeting(
        meetingTitle,
        segs.map(({ speaker: s, text, at }) => ({ speaker: s, text, at })),
        participants,
        staff,
        seconds
      ),
    [meetingTitle, participants, staff]
  );

  const handleFinish = useCallback(() => {
    const c = clockRef.current;
    if (c.since !== null) c.acc += Date.now() - c.since;
    c.since = null;
    stopListening();
    const seconds = currentSeconds();
    setElapsed(seconds);
    let segs = segments;
    if (interim.trim()) {
      segs = [...segs, { id: generateId(), speaker: speakerRef.current || "Speaker", text: interim.trim(), at: seconds }];
      setSegments(segs);
      setInterim("");
    }
    if (segs.length === 0) {
      toast.error("Nothing was captured yet. Speak, or type notes, before finishing.");
      if (phase === "capturing") {
        c.since = Date.now();
        if (speechSupported) startListening();
      }
      return;
    }
    setDraft(buildDraft(segs, seconds));
    setPhase("review");
  }, [stopListening, currentSeconds, segments, interim, buildDraft, speechSupported, phase, startListening]);

  const handleReset = useCallback(() => {
    stopListening();
    clockRef.current = { acc: 0, since: null };
    setPhase("idle");
    setElapsed(0);
    setSegments([]);
    setInterim("");
    setDraft(null);
    setNoteDraft("");
    setSpeechError(null);
    setStartedAt(null);
    setMeetingTitle(DEFAULT_TITLE);
  }, [stopListening]);

  const handleAddNotes = useCallback(() => {
    const lines = noteDraft.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const knownNames = staff.map((s) => s.name.toLowerCase());
    for (const line of lines) {
      // "Name: what they said" lines keep their speaker when Name is a staff member.
      const m = line.match(/^([^:]{2,40}):\s+(.+)$/);
      if (m && knownNames.includes(m[1].trim().toLowerCase())) {
        const who = staff.find((s) => s.name.toLowerCase() === m[1].trim().toLowerCase());
        addSegment(m[2], who?.name);
      } else {
        addSegment(line);
      }
    }
    setNoteDraft("");
  }, [noteDraft, staff, addSegment]);

  const handleCopyTranscript = useCallback(() => {
    const text = segments.map((s) => `[${formatRecordingTime(s.at)}] ${s.speaker}: ${s.text}`).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [segments]);

  // --- Draft editing ---
  const updateDraft = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const updateItem = (idx: number, patch: Partial<MeetingActionItem>) =>
    setDraft((d) =>
      d ? { ...d, action_items: d.action_items.map((a, i) => (i === idx ? { ...a, ...patch } : a)) } : d
    );

  const handleSave = useCallback(() => {
    if (!draft || !startedAt) return;
    const items = draft.action_items.filter((a) => a.text.trim());
    createMeeting.mutate(
      {
        input: {
          title: meetingTitle.trim() || DEFAULT_TITLE,
          meeting_date: startedAt.toISOString(),
          duration_seconds: elapsed,
          participants,
          transcript: segments.map(({ speaker: s, text, at }) => ({ speaker: s, text, at })),
          summary: draft.summary.trim(),
          key_points: draft.key_points.map((k) => k.trim()).filter(Boolean),
          action_items: items.map((a) => ({ ...a, text: a.text.trim() })),
        },
        createTasks: alsoCreateTasks,
      },
      {
        onSuccess: ({ meeting }) => {
          handleReset();
          setSelectedMeetingId(meeting.id);
          setActiveTab("history");
        },
      }
    );
  }, [draft, startedAt, createMeeting, meetingTitle, elapsed, participants, segments, alsoCreateTasks, handleReset]);

  const canEdit = (m: Meeting) => !!profile && (m.created_by_id === profile.id || isManager);

  const handleDelete = (m: Meeting) => {
    if (!window.confirm(`Delete "${m.title}"? This cannot be undone.`)) return;
    deleteMeeting.mutate(m.id, { onSuccess: () => setSelectedMeetingId(null) });
  };

  const speakerOptions = useMemo(() => {
    const names = new Set<string>(participants.map((p) => p.name));
    if (profile?.name) names.add(profile.name);
    names.add("Speaker");
    return [...names];
  }, [participants, profile]);

  const isCapturing = phase === "capturing" || phase === "paused";
  const assignedCount = draft?.action_items.filter((i) => i.assignee_id).length ?? 0;
  const totalItems = draft?.action_items.length ?? 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Meeting AI</h1>
                <p className="text-xs text-slate-500">Transcribe meetings, then pull out key points and action items</p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => {
                  setActiveTab("recorder");
                  setSelectedMeetingId(null);
                }}
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
                {meetings.length > 0 && <span className="text-xs text-slate-400">({meetings.length})</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {/* ============================== RECORDER ============================== */}
          {activeTab === "recorder" && (
            <motion.div key="recorder" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              {isViewer && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Your account is read-only, so you can capture notes here but cannot save meetings.
                </div>
              )}

              {/* Title + participants */}
              {phase !== "review" && (
                <div className="mb-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Meeting Title</label>
                    <input
                      type="text"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      placeholder="Enter meeting title..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Participants</label>
                    <div className="relative flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 min-h-[46px] shadow-sm">
                      {participants.map((p) => (
                        <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 pl-1 pr-2 py-0.5 text-xs text-slate-700">
                          <SpeakerAvatar name={p.name} />
                          {p.name}
                          <button
                            onClick={() => setParticipantIds((prev) => prev.filter((id) => id !== p.id))}
                            className="text-slate-400 hover:text-red-500"
                            aria-label={`Remove ${p.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => setShowParticipantPicker(true)}
                        disabled={staffLoading}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:border-violet-400 hover:text-violet-600"
                      >
                        {staffLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                        Add
                      </button>
                      <AnimatePresence>
                        {showParticipantPicker && (
                          <StaffPicker
                            staff={staff}
                            excludeIds={participantIds}
                            onSelect={(s) => setParticipantIds((prev) => [...prev, s.id])}
                            onClose={() => setShowParticipantPicker(false)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )}

              {/* Control panel */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
                <div className="p-6">
                  <div className="flex items-center justify-center mb-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium",
                        phase === "idle" && "bg-slate-100 text-slate-600",
                        phase === "capturing" && "bg-red-100 text-red-700",
                        phase === "paused" && "bg-amber-100 text-amber-700",
                        phase === "review" && "bg-green-100 text-green-700"
                      )}
                    >
                      {phase === "idle" && (
                        <>
                          <Mic className="h-4 w-4" /> Ready
                        </>
                      )}
                      {phase === "capturing" && (
                        <>
                          <CircleDot className="h-4 w-4 animate-pulse" /> {listening ? "Listening" : "Capturing notes"}
                        </>
                      )}
                      {phase === "paused" && (
                        <>
                          <Pause className="h-4 w-4" /> Paused
                        </>
                      )}
                      {phase === "review" && (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Review and save
                        </>
                      )}
                    </span>
                  </div>

                  {phase !== "idle" && (
                    <div className="text-center mb-4">
                      <p className="text-4xl font-mono font-bold text-slate-800">{formatRecordingTime(elapsed)}</p>
                    </div>
                  )}

                  {isCapturing && speechSupported && !speechError && (
                    <div className="mb-6">
                      <AudioVisualizer isActive={phase === "capturing" && listening} />
                    </div>
                  )}

                  {(phase === "idle" || isCapturing) && (!speechSupported || speechError) && (
                    <div className="mb-5 mx-auto max-w-xl flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                      <MicOff className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      <span>
                        {speechError ??
                          "Live speech-to-text isn't available in this browser (try Chrome or Edge). You can still type or paste notes as the transcript; the timer tracks the meeting length."}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    {phase === "idle" && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStart}
                        className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 px-8 py-4 text-white font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-shadow"
                      >
                        {speechSupported ? <Mic className="h-5 w-5" /> : <Keyboard className="h-5 w-5" />}
                        {speechSupported ? "Start Meeting" : "Start Meeting (notes)"}
                      </motion.button>
                    )}

                    {isCapturing && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleTogglePause}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-5 py-3 font-medium shadow-sm transition-all",
                            phase === "paused" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          )}
                        >
                          {phase === "paused" ? (
                            <>
                              <Play className="h-4 w-4" /> Resume
                            </>
                          ) : (
                            <>
                              <Pause className="h-4 w-4" /> Pause
                            </>
                          )}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleFinish}
                          className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 text-white font-medium shadow-sm hover:bg-slate-900 transition-colors"
                        >
                          <Square className="h-4 w-4" /> Finish & Summarise
                        </motion.button>
                        <button onClick={handleReset} className="text-sm text-slate-500 hover:text-red-600">
                          Discard
                        </button>
                      </>
                    )}

                    {phase === "review" && (
                      <>
                        <button
                          onClick={handleSave}
                          disabled={isViewer || createMeeting.isPending}
                          className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-white font-medium shadow-sm hover:bg-violet-700 transition-colors disabled:opacity-50"
                        >
                          {createMeeting.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save Meeting
                        </button>
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={alsoCreateTasks}
                            onChange={(e) => setAlsoCreateTasks(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-violet-600"
                          />
                          Create tasks from action items
                        </label>
                        <button
                          onClick={() => {
                            if (window.confirm("Discard this meeting without saving?")) handleReset();
                          }}
                          className="text-sm text-slate-500 hover:text-red-600"
                        >
                          Discard
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Transcript + review */}
              {phase !== "idle" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Transcript */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <h2 className="font-semibold text-slate-800 text-sm">Transcript</h2>
                        <span className="text-xs text-slate-400">({segments.length} segments)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {segments.length > 0 && (
                          <button
                            onClick={handleCopyTranscript}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
                          >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? "Copied" : "Copy"}
                          </button>
                        )}
                        {listening && (
                          <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            Live
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-[420px] overflow-y-auto p-4 space-y-3">
                      {segments.length === 0 && !interim && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <Volume2 className="h-10 w-10 text-slate-300 mb-3" />
                          <p className="text-sm text-slate-500">{listening ? "Listening for speech..." : "No transcript yet"}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {listening ? "Speech appears here as it is recognised" : "Type or paste notes below"}
                          </p>
                        </div>
                      )}
                      {segments.map((seg) => (
                        <div key={seg.id} className="group flex gap-3">
                          <SpeakerAvatar name={seg.speaker} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-700">{seg.speaker}</span>
                              <span className="text-[10px] text-slate-400">{formatRecordingTime(seg.at)}</span>
                              {phase !== "review" && (
                                <button
                                  onClick={() => setSegments((prev) => prev.filter((s) => s.id !== seg.id))}
                                  className="ml-auto opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"
                                  aria-label="Remove segment"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{seg.text}</p>
                          </div>
                        </div>
                      ))}
                      {interim && (
                        <div className="flex gap-3 opacity-60">
                          <SpeakerAvatar name={activeSpeaker} />
                          <p className="text-sm italic text-slate-500 mt-1">{interim}</p>
                        </div>
                      )}
                      <div ref={transcriptEndRef} />
                    </div>

                    {isCapturing && (
                      <div className="border-t border-slate-100 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>Speaking now:</span>
                          <select
                            value={activeSpeaker}
                            onChange={(e) => {
                              speakerRef.current = e.target.value;
                              setSpeaker(e.target.value);
                            }}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                          >
                            {speakerOptions.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                handleAddNotes();
                              }
                            }}
                            rows={2}
                            placeholder={'Type or paste notes (one per line; "Name: text" sets the speaker)'}
                            className="flex-1 resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                          <button
                            onClick={handleAddNotes}
                            disabled={!noteDraft.trim()}
                            className="self-end flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right column */}
                  <div className="space-y-6">
                    {phase !== "review" && (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-8 text-center">
                        <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-500">Summary and action items appear when you finish</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Sentences with &quot;will&quot;, &quot;need to&quot;, &quot;action&quot;, &quot;follow up&quot; or &quot;by Friday&quot; become action items. You can edit everything before saving.
                        </p>
                      </div>
                    )}

                    {phase === "review" && draft && (
                      <>
                        <SectionCard
                          icon={<Sparkles className="h-4 w-4 text-violet-500" />}
                          title="Summary"
                          open={showSummary}
                          onToggle={() => setShowSummary(!showSummary)}
                          extra={
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDraft(buildDraft(segments, elapsed));
                              }}
                              className="ml-2 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-violet-600"
                              title="Rebuild summary, key points and action items from the transcript"
                            >
                              <RotateCcw className="h-3 w-3" /> Rebuild
                            </button>
                          }
                        >
                          <div className="p-5 space-y-3">
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {formatDuration(elapsed)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" /> {participants.length} participants
                              </span>
                            </div>
                            <input
                              value={meetingTitle}
                              onChange={(e) => setMeetingTitle(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
                              placeholder="Meeting title"
                            />
                            <textarea
                              value={draft.summary}
                              onChange={(e) => updateDraft({ summary: e.target.value })}
                              rows={4}
                              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                          </div>
                        </SectionCard>

                        <SectionCard
                          icon={<Zap className="h-4 w-4 text-amber-500" />}
                          title="Key Points"
                          extra={<span className="text-xs text-slate-400">({draft.key_points.length})</span>}
                          open={showKeyPoints}
                          onToggle={() => setShowKeyPoints(!showKeyPoints)}
                        >
                          <div className="p-4 space-y-2">
                            {draft.key_points.map((kp, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="mt-3 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                <textarea
                                  value={kp}
                                  rows={2}
                                  onChange={(e) =>
                                    updateDraft({ key_points: draft.key_points.map((k, j) => (j === i ? e.target.value : k)) })
                                  }
                                  className="flex-1 resize-y rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                                <button
                                  onClick={() => updateDraft({ key_points: draft.key_points.filter((_, j) => j !== i) })}
                                  className="mt-2 text-slate-300 hover:text-red-500"
                                  aria-label="Remove key point"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => updateDraft({ key_points: [...draft.key_points, ""] })}
                              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add key point
                            </button>
                          </div>
                        </SectionCard>

                        <SectionCard
                          icon={<ListTodo className="h-4 w-4 text-blue-500" />}
                          title="Action Items"
                          extra={
                            <span className="text-xs text-slate-400">
                              ({assignedCount}/{totalItems} assigned)
                            </span>
                          }
                          open={showActions}
                          onToggle={() => setShowActions(!showActions)}
                        >
                          <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
                            {draft.action_items.length === 0 && (
                              <p className="text-xs text-slate-400 text-center py-4">No action items found. Add one below.</p>
                            )}
                            {draft.action_items.map((item, i) => (
                              <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                <div className="flex items-start gap-2">
                                  <textarea
                                    value={item.text}
                                    rows={2}
                                    onChange={(e) => updateItem(i, { text: e.target.value })}
                                    className="flex-1 resize-y rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    placeholder="What needs to happen?"
                                  />
                                  <button
                                    onClick={() =>
                                      updateDraft({ action_items: draft.action_items.filter((_, j) => j !== i) })
                                    }
                                    className="mt-1 text-slate-300 hover:text-red-500"
                                    aria-label="Remove action item"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <select
                                    value={item.assignee_id ?? ""}
                                    onChange={(e) => {
                                      const s = staffById.get(e.target.value);
                                      updateItem(i, { assignee_id: s?.id ?? null, assignee_name: s?.name ?? null });
                                    }}
                                    className={cn(
                                      "rounded-lg border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500",
                                      item.assignee_id ? "border-green-200 bg-green-50 text-green-800" : "border-slate-200 text-slate-500"
                                    )}
                                  >
                                    <option value="">Unassigned</option>
                                    {staff.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="date"
                                    value={item.due ?? ""}
                                    onChange={(e) => updateItem(i, { due: e.target.value || null })}
                                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                  />
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() =>
                                updateDraft({
                                  action_items: [
                                    ...draft.action_items,
                                    { text: "", assignee_id: null, assignee_name: null, due: null, task_id: null },
                                  ],
                                })
                              }
                              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add action item
                            </button>
                          </div>
                        </SectionCard>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Idle explainer */}
              {phase === "idle" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center mb-3">
                      <Mic className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">Capture</h3>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Live speech-to-text in supported browsers, or type and paste notes. Pause and resume as needed.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center mb-3">
                      <FileText className="h-6 w-6 text-violet-600" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">Summarise</h3>
                    <p className="text-xs text-slate-500 mt-1.5">
                      A summary, key points and action items are drafted from the transcript for you to edit.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                      <ListTodo className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">Assign</h3>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Staff named in a sentence are suggested as assignees. Save to turn action items into tasks.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ============================== HISTORY ============================== */}
          {activeTab === "history" && !selectedMeeting && (
            <motion.div key="history" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Meeting History</h2>
                  <p className="text-sm text-slate-500">Saved meetings and their outcomes</p>
                </div>
                <span className="text-sm text-slate-400">{meetings.length} meetings</span>
              </div>

              {meetingsLoading && (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              {meetingsError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Couldn&apos;t load meetings: {(meetingsError as Error).message}
                </div>
              )}
              {!meetingsLoading && !meetingsError && meetings.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-12 text-center">
                  <History className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No meetings saved yet</p>
                  <p className="text-xs text-slate-400 mt-1">Capture a meeting in the Recorder tab and save it to see it here.</p>
                </div>
              )}

              <div className="space-y-4">
                {meetings.map((m) => (
                  <PastMeetingCard key={m.id} meeting={m} onView={() => setSelectedMeetingId(m.id)} />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "history" && selectedMeeting && (
            <motion.div key="meeting-detail" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedMeetingId(null)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <ChevronDown className="h-4 w-4 rotate-90" /> Back to History
                </button>
                {canEdit(selectedMeeting) && (
                  <button
                    onClick={() => handleDelete(selectedMeeting)}
                    disabled={deleteMeeting.isPending}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 mb-6">
                <h2 className="text-xl font-bold text-slate-800">{selectedMeeting.title}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <CalendarCheck className="h-4 w-4" />
                    {formatDateTime(selectedMeeting.meeting_date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> {formatDuration(selectedMeeting.duration_seconds)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> {selectedMeeting.participants.length} participants
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedMeeting.participants.map((p, i) => (
                    <span key={`${p.id}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                      <SpeakerAvatar name={p.name} /> {p.name}
                    </span>
                  ))}
                </div>
                {selectedMeeting.summary && (
                  <p className="mt-4 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selectedMeeting.summary}</p>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-amber-500" /> Key Points
                  </h3>
                  {selectedMeeting.key_points.length === 0 && <p className="text-xs text-slate-400">None recorded.</p>}
                  <ul className="space-y-2">
                    {selectedMeeting.key_points.map((kp, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        {kp}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                      <ListTodo className="h-4 w-4 text-blue-500" /> Action Items
                    </h3>
                    {canEdit(selectedMeeting) && selectedMeeting.action_items.some((a) => !a.task_id) && (
                      <button
                        onClick={() => createTasks.mutate(selectedMeeting)}
                        disabled={createTasks.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {createTasks.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Create tasks
                      </button>
                    )}
                  </div>
                  {selectedMeeting.action_items.length === 0 && <p className="text-xs text-slate-400">None recorded.</p>}
                  <div className="space-y-2">
                    {selectedMeeting.action_items.map((a, i) => (
                      <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                        <p className="text-sm text-slate-700">{a.text}</p>
                        <div className="mt-1.5 flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {a.assignee_name ?? "Unassigned"}
                          </span>
                          {a.due && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {formatDueKey(a.due)}
                            </span>
                          )}
                          {a.task_id ? (
                            <a href="/tasks" className="flex items-center gap-1 text-green-600 hover:underline">
                              <CheckCircle2 className="h-3 w-3" /> Task created
                            </a>
                          ) : (
                            <span className="text-slate-400">No task yet</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <button
                  onClick={() => setShowDetailTranscript(!showDetailTranscript)}
                  className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-slate-50/50"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <FileText className="h-4 w-4 text-slate-500" /> Transcript
                    <span className="text-xs font-normal text-slate-400">({selectedMeeting.transcript.length} segments)</span>
                  </span>
                  {showDetailTranscript ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>
                {showDetailTranscript && (
                  <div className="border-t border-slate-100 max-h-[480px] overflow-y-auto p-4 space-y-3">
                    {selectedMeeting.transcript.length === 0 && <p className="text-xs text-slate-400">No transcript saved.</p>}
                    {selectedMeeting.transcript.map((seg, i) => (
                      <div key={i} className="flex gap-3">
                        <SpeakerAvatar name={seg.speaker} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700">{seg.speaker}</span>
                            <span className="text-[10px] text-slate-400">{formatRecordingTime(seg.at)}</span>
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{seg.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
