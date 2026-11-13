"use client";

import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  Plus,
  Search,
  Phone,
  Mail,
  GripVertical,
  Building2,
  Clock,
  X,
  Sparkles,
  AlertTriangle,
  Bell,
  Lightbulb,
  CheckCircle2,
  Zap,
  ArrowUpFromLine,
  Wrench,
  BriefcaseBusiness,
  ShieldCheck,
  CircleDot,
  UserCheck,
  Pencil,
  Trash2,
  Loader2,
  Car,
  UserPlus,
  RefreshCw,
  Upload,
  Download,
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
  Legend,
} from "recharts";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/components/providers/session-provider";
import type { DealStage } from "@/lib/supabase/database.types";
import {
  useDeals,
  useStaff,
  useCreateDeal,
  useUpdateDeal,
  useMoveDealStage,
  useDeleteDeal,
  useAddEscalation,
  useUpdateEscalation,
  useConvertDealToCustomer,
  useImportDeals,
  fetchDealImportLookups,
  dealKey,
  STAGE_PROBABILITY,
  type Deal,
  type DealInput,
  type DealImportRecord,
  type EscalationDept,
  type EscalationStatus,
  type StaffMember,
} from "@/lib/hooks/use-deals";
import { ImportDialog, type ImportField, type MappedRow, type RowCheck } from "@/components/data-import/import-dialog";
import { RecordFiles } from "@/components/files/record-files";
import { downloadText, parseAmount, parseDate, toCsv } from "@/lib/import/parse";

// ---------------------------------------------------------------------------
// Types & configuration
// ---------------------------------------------------------------------------

type Stage = DealStage;

interface StageConfig {
  id: Stage;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  chartColor: string;
}

type InsightType = "reminder" | "suggestion" | "risk" | "opportunity";

interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  dealId: string | null;
  priority: "high" | "medium" | "low";
}

const escalationConfig: Record<EscalationDept, { label: string; color: string; bgColor: string; description: string }> = {
  technical: { label: "Technical Team", color: "text-blue-700", bgColor: "bg-blue-50", description: "Request technical assessment, solution design, or feasibility review" },
  finance: { label: "Finance Team", color: "text-emerald-700", bgColor: "bg-emerald-50", description: "Request pricing approval, discount authorization, or payment terms review" },
  management: { label: "Management", color: "text-purple-700", bgColor: "bg-purple-50", description: "Request executive involvement, strategic decision, or contract approval" },
};

const stages: StageConfig[] = [
  { id: "lead", label: "New Lead", color: "text-slate-700", bgColor: "bg-slate-100", borderColor: "border-slate-300", chartColor: "#94a3b8" },
  { id: "qualified", label: "Qualified", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-300", chartColor: "#1e8fe0" },
  { id: "proposal", label: "Proposal", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-300", chartColor: "#8b5cf6" },
  { id: "negotiation", label: "Negotiation", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-300", chartColor: "#f59e0b" },
  { id: "closed_won", label: "Closed Won", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-300", chartColor: "#10b981" },
  { id: "closed_lost", label: "Closed Lost", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-300", chartColor: "#ef4444" },
];
const stageById = (id: Stage) => stages.find((s) => s.id === id)!;
const ACTIVE_STAGES = stages.filter((s) => s.id !== "closed_won" && s.id !== "closed_lost");

const SOURCES = ["Website", "Referral", "Cold Outreach", "Trade Show", "Social Media", "Tender", "Existing Customer", "Other"];
const SOURCE_COLORS = ["#1e8fe0", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#64748b", "#ec4899"];

const DAY_MS = 86_400_000;
const STALE_DAYS = 14;

const isClosed = (d: Deal) => d.stage === "closed_won" || d.stage === "closed_lost";
const isOpenEscalation = (s: EscalationStatus) => s === "pending" || s === "in_review";

interface DealForm {
  title: string;
  company: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  value: string;
  fleet_size: string;
  stage: Stage;
  probability: string;
  owner_id: string;
  expected_close: string;
  source: string;
  notes: string;
}

const emptyForm = (ownerId: string): DealForm => ({
  title: "",
  company: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  value: "",
  fleet_size: "",
  stage: "lead",
  probability: String(STAGE_PROBABILITY.lead),
  owner_id: ownerId,
  expected_close: "",
  source: "Website",
  notes: "",
});

const dealToForm = (d: Deal): DealForm => ({
  title: d.title,
  company: d.company,
  contact_name: d.contact_name ?? "",
  contact_email: d.contact_email ?? "",
  contact_phone: d.contact_phone ?? "",
  value: d.value ? String(d.value) : "",
  fleet_size: d.fleet_size != null ? String(d.fleet_size) : "",
  stage: d.stage,
  probability: String(d.probability),
  owner_id: d.owner_id ?? "",
  expected_close: d.expected_close ?? "",
  source: d.source ?? "",
  notes: d.notes ?? "",
});

const formToInput = (f: DealForm): DealInput => {
  const prob = Math.max(0, Math.min(100, Math.round(Number(f.probability) || 0)));
  return {
    title: f.title.trim(),
    company: f.company.trim(),
    contact_name: f.contact_name.trim() || null,
    contact_email: f.contact_email.trim() || null,
    contact_phone: f.contact_phone.trim() || null,
    value: Number(f.value) || 0,
    fleet_size: f.fleet_size ? Math.max(0, Math.round(Number(f.fleet_size))) : null,
    stage: f.stage,
    probability: prob,
    owner_id: f.owner_id || null,
    expected_close: f.expected_close || null,
    source: f.source || null,
    notes: f.notes.trim() || null,
  };
};

const compactCurrency = (v: number) =>
  Math.abs(v) >= 1_000_000 ? `N$${(v / 1_000_000).toFixed(1)}m` : Math.abs(v) >= 1000 ? `N$${Math.round(v / 1000)}k` : `N$${v}`;

const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

// ---------------------------------------------------------------------------
// Import / export helpers
// ---------------------------------------------------------------------------

const DEAL_IMPORT_FIELDS: ImportField[] = [
  { key: "title", label: "Title", required: true, aliases: ["title", "deal", "deal name", "deal title", "opportunity", "opportunity name", "deal description"], example: "Fleet tracking rollout" },
  { key: "company", label: "Company", required: true, aliases: ["company", "company name", "account", "account name", "organisation", "organization", "customer", "client"], example: "Acme Logistics" },
  { key: "contact_name", label: "Contact name", aliases: ["contact name", "contact", "contact person", "primary contact"], example: "Jane Doe" },
  { key: "contact_email", label: "Contact email", aliases: ["contact email", "email", "e-mail", "email address"], example: "jane@acme.com" },
  { key: "contact_phone", label: "Contact phone", aliases: ["contact phone", "phone", "telephone", "mobile", "cell", "phone number"], example: "+264 81 000 0000" },
  { key: "value", label: "Value", aliases: ["value", "deal value", "amount", "deal amount", "revenue", "total"], example: "N$ 125,000" },
  { key: "fleet_size", label: "Fleet size", aliases: ["fleet size", "fleet", "vehicles", "vehicle count", "units", "no of vehicles"], example: "40" },
  { key: "stage", label: "Stage", aliases: ["stage", "deal stage", "status", "pipeline stage"], example: "Proposal" },
  { key: "probability", label: "Probability", aliases: ["probability", "probability %", "win probability", "chance", "likelihood"], example: "50" },
  { key: "owner", label: "Owner", aliases: ["owner", "owner email", "deal owner", "sales rep", "salesperson", "assigned to", "rep"], example: "" },
  { key: "expected_close", label: "Expected close", aliases: ["expected close", "expected close date", "close date", "closing date", "close"], example: "2026-12-15" },
  { key: "source", label: "Source", aliases: ["source", "lead source", "channel", "origin"], example: "Referral" },
  { key: "notes", label: "Notes", aliases: ["notes", "note", "comments", "description", "details"], example: "" },
];

const words = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;

/** Maps common stage wording ("won", "proposal sent", "negotiating", "new") to a pipeline stage. */
function mapStage(raw: string): Stage | null {
  const w = words(raw);
  if (!w.trim()) return null;
  if (/ (closed lost|lost|dead|declined|rejected|cancelled|canceled|no deal) /.test(w)) return "closed_lost";
  if (/ (closed won|won|win|signed|contracted) /.test(w)) return "closed_won";
  if (/ negotiat/.test(w) || / (contract sent|commit|commitment) /.test(w)) return "negotiation";
  if (/ (proposal|proposals|quote|quoted|quotation|tender|offer) /.test(w)) return "proposal";
  if (/ (qualified|qualifying|qualification|sql|discovery|demo|meeting) /.test(w)) return "qualified";
  if (/ (lead|new|new lead|prospect|open|contacted|cold|mql|inquiry|enquiry) /.test(w)) return "lead";
  return null;
}

/** "70", "70%", "0.7" → 70; anything else → null. */
function parseProbability(raw: string): number | null {
  const s = raw.trim().replace(/%$/, "").trim();
  if (!s) return null;
  let n = Number(s.replace(",", "."));
  if (!isFinite(n)) return null;
  if (n > 0 && n < 1 && s.includes(".") && !raw.includes("%")) n *= 100;
  if (n < 0 || n > 100) return null;
  return Math.round(n);
}

function matchStaff(raw: string, staff: StaffMember[]): StaffMember | null {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  const byEmail = staff.find((s) => (s.email ?? "").toLowerCase() === q);
  if (byEmail) return byEmail;
  const byName = staff.filter((s) => (s.name ?? "").trim().toLowerCase() === q);
  if (byName.length === 1) return byName[0];
  const partial = staff.filter((s) => {
    const n = (s.name ?? "").toLowerCase();
    return n && (n.startsWith(q + " ") || n.split(/\s+/).includes(q));
  });
  return partial.length === 1 ? partial[0] : null;
}

const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SalesPipelinePage() {
  const { profile } = useAuth();
  const canEdit = !!profile && profile.role !== "VIEWER" && profile.role !== "CLIENT";

  const { data: deals = [], isLoading, error, refetch } = useDeals();
  const { data: staff = [] } = useStaff();
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const moveStage = useMoveDealStage();
  const deleteDeal = useDeleteDeal();
  const addEscalation = useAddEscalation();
  const updateEscalation = useUpdateEscalation();
  const convertDeal = useConvertDealToCustomer();
  const importDeals = useImportDeals();
  const [showImport, setShowImport] = useState(false);

  const [now] = useState(() => Date.now());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<DealForm>(emptyForm(""));
  const [showInsights, setShowInsights] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateDept, setEscalateDept] = useState<EscalationDept | null>(null);
  const [escalateReason, setEscalateReason] = useState("");
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});
  const [convertDealId, setConvertDealId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedDeal = deals.find((d) => d.id === selectedDealId) ?? null;
  const convertCandidate = deals.find((d) => d.id === convertDealId) ?? null;
  const staffName = (id: string | null) => (id ? staff.find((s) => s.id === id)?.name ?? "Unknown" : "Unassigned");

  const filteredDeals = (() => {
    if (!searchQuery) return deals;
    const q = searchQuery.toLowerCase();
    return deals.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.company.toLowerCase().includes(q) ||
        (d.contact_name ?? "").toLowerCase().includes(q)
    );
  })();

  const dealsByStage = (() => {
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
  })();

  const metrics = (() => {
    const activeDeals = deals.filter((d) => !isClosed(d));
    const wonDeals = deals.filter((d) => d.stage === "closed_won");
    const lostDeals = deals.filter((d) => d.stage === "closed_lost");
    const totalPipeline = activeDeals.reduce((sum, d) => sum + d.value, 0);
    const weightedPipeline = activeDeals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
    const totalWon = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const winRate =
      wonDeals.length + lostDeals.length > 0
        ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
        : 0;
    return {
      totalPipeline,
      weightedPipeline,
      totalWon,
      winRate,
      wonCount: wonDeals.length,
      closedCount: wonDeals.length + lostDeals.length,
      activeCount: activeDeals.length,
      avgDealSize: activeDeals.length > 0 ? totalPipeline / activeDeals.length : 0,
      followUps: activeDeals.filter((d) => (now - new Date(d.last_activity_at).getTime()) / DAY_MS >= STALE_DAYS).length,
      closingThisMonth: activeDeals.filter((d) => {
        if (!d.expected_close) return false;
        const close = new Date(d.expected_close);
        const n = new Date(now);
        return close.getMonth() === n.getMonth() && close.getFullYear() === n.getFullYear();
      }).length,
    };
  })();

  const stageChartData = ACTIVE_STAGES.map((s) => {
        const inStage = deals.filter((d) => d.stage === s.id);
        return {
          stage: s.label,
          value: inStage.reduce((sum, d) => sum + d.value, 0),
          weighted: inStage.reduce((sum, d) => sum + d.value * (d.probability / 100), 0),
        };
      });

  const sourceData = (() => {
    const counts = new Map<string, number>();
    deals.forEach((d) => {
      const key = d.source?.trim() || "Unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: SOURCE_COLORS[i % SOURCE_COLORS.length] }));
  })();

  // Rule-based insights computed from the real deals.
  const insights = (() => {
    const list: Insight[] = [];
    const active = deals.filter((d) => !isClosed(d));
    const avgActive = active.length > 0 ? active.reduce((s, d) => s + d.value, 0) / active.length : 0;
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    active.forEach((d) => {
      const idle = Math.floor((now - new Date(d.last_activity_at).getTime()) / DAY_MS);
      if (idle >= STALE_DAYS) {
        list.push({
          id: `stale-${d.id}`,
          type: "reminder",
          title: `No activity for ${idle} days`,
          description: `"${d.title}" (${d.company}) has had no activity since ${formatDate(d.last_activity_at)}. Schedule a follow-up${d.contact_name ? ` with ${d.contact_name}` : ""}.`,
          dealId: d.id,
          priority: idle >= STALE_DAYS * 2 ? "high" : "medium",
        });
      }
      if (d.expected_close && new Date(d.expected_close) < todayStart) {
        list.push({
          id: `overdue-${d.id}`,
          type: "risk",
          title: "Expected close date passed",
          description: `"${d.title}" was expected to close on ${formatDate(d.expected_close)} but is still in ${stageById(d.stage).label}. Update the close date or move the deal on.`,
          dealId: d.id,
          priority: "high",
        });
      }
      if (d.stage === "negotiation" && d.value > 0 && d.value >= avgActive) {
        list.push({
          id: `highval-${d.id}`,
          type: "opportunity",
          title: "High-value deal in negotiation",
          description: `"${d.title}" is worth ${formatCurrency(d.value)}${active.length > 1 ? `, above the average open deal of ${formatCurrency(avgActive)}` : ""}. Prioritise getting it signed.`,
          dealId: d.id,
          priority: "medium",
        });
      }
      const pending = d.escalations.filter(
        (e) => isOpenEscalation(e.status) && (now - new Date(e.created_at).getTime()) / DAY_MS >= 3
      );
      if (pending.length > 0) {
        list.push({
          id: `esc-${d.id}`,
          type: "reminder",
          title: "Escalation awaiting response",
          description: `"${d.title}" has ${pending.length} escalation${pending.length > 1 ? "s" : ""} open for 3+ days (${pending.map((e) => escalationConfig[e.dept].label).join(", ")}).`,
          dealId: d.id,
          priority: "medium",
        });
      }
    });

    deals
      .filter((d) => d.stage === "closed_won" && !d.customer_id)
      .forEach((d) => {
        list.push({
          id: `convert-${d.id}`,
          type: "suggestion",
          title: "Won deal not linked to a customer",
          description: `"${d.title}" (${d.company}) was won but has no customer record. Create the customer and start onboarding.`,
          dealId: d.id,
          priority: "low",
        });
      });

    const order = { high: 0, medium: 1, low: 2 };
    return list.sort((a, b) => order[a.priority] - order[b.priority]);
  })();

  const activeInsights = insights.filter((i) => !dismissed.has(i.id));

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const moveDeal = (deal: Deal, stage: Stage) => {
    if (!canEdit || deal.stage === stage) return;
    moveStage.mutate(
      { id: deal.id, stage },
      {
        onSuccess: () => {
          if (stage === "closed_won" && !deal.customer_id) setConvertDealId(deal.id);
        },
      }
    );
  };

  const handleDrop = (stage: Stage) => {
    const deal = deals.find((d) => d.id === draggedDeal);
    if (deal) moveDeal(deal, stage);
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  const stageTotal = (stage: Stage) => dealsByStage[stage].reduce((sum, d) => sum + d.value, 0);

  const openCreate = () => {
    setForm(emptyForm(profile?.id ?? ""));
    setFormMode("create");
  };

  const openEdit = (deal: Deal) => {
    setForm(dealToForm(deal));
    setFormMode("edit");
  };

  const handleSaveDeal = () => {
    if (!form.title.trim() || !form.company.trim()) return;
    const input = formToInput(form);
    if (formMode === "create") {
      createDeal.mutate(input, { onSuccess: () => setFormMode(null) });
    } else if (formMode === "edit" && selectedDeal) {
      const wasWon = selectedDeal.stage === "closed_won";
      const dealId = selectedDeal.id;
      const hasCustomer = !!selectedDeal.customer_id;
      updateDeal.mutate(
        { id: dealId, ...input },
        {
          onSuccess: () => {
            setFormMode(null);
            if (!wasWon && input.stage === "closed_won" && !hasCustomer) setConvertDealId(dealId);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!selectedDeal) return;
    deleteDeal.mutate(selectedDeal.id, {
      onSuccess: () => {
        setSelectedDealId(null);
        setConfirmDelete(false);
      },
    });
  };

  const closeEscalate = () => {
    setShowEscalateModal(false);
    setEscalateDept(null);
    setEscalateReason("");
  };

  const handleEscalate = () => {
    if (!selectedDeal || !escalateDept || !escalateReason.trim()) return;
    addEscalation.mutate(
      { dealId: selectedDeal.id, dept: escalateDept, reason: escalateReason.trim(), createdBy: profile?.name ?? null },
      { onSuccess: closeEscalate }
    );
  };

  const setEscalationStatus = (dealId: string, escId: string, status: EscalationStatus) => {
    updateEscalation.mutate(
      { dealId, escalationId: escId, status, note: responseNotes[escId] ?? null, by: profile?.name ?? null },
      { onSuccess: () => setResponseNotes((p) => ({ ...p, [escId]: "" })) }
    );
  };

  const getEscalationStatusStyle = (status: EscalationStatus) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-700";
      case "in_review": return "bg-blue-100 text-blue-700";
      case "approved": return "bg-emerald-100 text-emerald-700";
      case "rejected": return "bg-red-100 text-red-700";
    }
  };

  const getEscalationStatusLabel = (status: EscalationStatus) => {
    switch (status) {
      case "pending": return "Pending";
      case "in_review": return "In Review";
      case "approved": return "Approved";
      case "rejected": return "Rejected";
    }
  };

  const saving = createDeal.isPending || updateDeal.isPending;

  // -------------------------------------------------------------------------
  // Import / export
  // -------------------------------------------------------------------------

  const validateImport = async (rows: MappedRow[]): Promise<RowCheck<DealImportRecord>[]> => {
    const { existingKeys, customers } = await fetchDealImportLookups();
    const customerByName = new Map<string, { id: string; label: string }>();
    for (const c of customers) {
      for (const n of [c.company, c.name]) {
        const k = n?.trim().toLowerCase();
        if (k && !customerByName.has(k)) customerByName.set(k, { id: c.id, label: c.company || c.name });
      }
    }
    const me = profile ? staff.find((s) => s.id === profile.id) ?? null : null;
    const myLabel = me?.name || profile?.name || "You";
    const seenInFile = new Map<string, number>();

    return rows.map((row): RowCheck<DealImportRecord> => {
      const v = row.values;
      const notes: string[] = [];
      const title = v.title.replace(/\s+/g, " ").trim();
      const company = v.company.replace(/\s+/g, " ").trim();
      if (!title) return { line: row.line, ok: false, error: "Title is empty." };
      if (!company) return { line: row.line, ok: false, error: "Company is empty." };

      const key = dealKey(title, company);
      if (existingKeys.has(key))
        return { line: row.line, ok: false, error: `Already in the pipeline: "${title}" for ${company} exists.` };
      const earlier = seenInFile.get(key);
      if (earlier) return { line: row.line, ok: false, error: `Duplicate of row ${earlier} ("${title}" for ${company}).` };
      seenInFile.set(key, row.line);

      let value = 0;
      if (v.value) {
        const n = parseAmount(v.value);
        if (n === null) return { line: row.line, ok: false, error: `Value "${v.value}" isn't a number.` };
        if (n < 0) return { line: row.line, ok: false, error: `Value ${v.value} is negative.` };
        value = Math.round(n * 100) / 100;
      }

      let fleet: number | null = null;
      if (v.fleet_size) {
        const n = parseAmount(v.fleet_size);
        if (n === null || n < 0) notes.push(`Fleet size "${v.fleet_size}" ignored`);
        else fleet = Math.round(n);
      }

      let stage: Stage = "lead";
      if (v.stage) {
        const mapped = mapStage(v.stage);
        if (mapped) stage = mapped;
        else notes.push(`Stage "${v.stage}" not recognised, set to New Lead`);
      }

      let probability = STAGE_PROBABILITY[stage];
      if (v.probability) {
        const p = parseProbability(v.probability);
        if (p === null) notes.push(`Probability "${v.probability}" ignored, using ${probability}%`);
        else probability = p;
      }

      let ownerId = profile?.id ?? null;
      let ownerLabel = myLabel;
      if (v.owner) {
        const hit = matchStaff(v.owner, staff);
        if (hit) {
          ownerId = hit.id;
          ownerLabel = hit.name || hit.email || "Staff member";
        } else notes.push(`Owner "${v.owner}" not found, assigned to ${myLabel}`);
      }

      let expectedClose: string | null = null;
      if (v.expected_close) {
        expectedClose = parseDate(v.expected_close);
        if (!expectedClose) notes.push(`Expected close "${v.expected_close}" isn't a date, left empty`);
      }

      const email = v.contact_email.trim();
      if (email && !looksLikeEmail(email)) notes.push(`Contact email "${email}" looks invalid`);

      const customer = customerByName.get(company.toLowerCase()) ?? null;

      return {
        line: row.line,
        ok: true,
        note: notes.length ? notes.join("; ") : undefined,
        record: {
          title,
          company,
          contact_name: v.contact_name || null,
          contact_email: email || null,
          contact_phone: v.contact_phone || null,
          value,
          fleet_size: fleet,
          stage,
          probability,
          owner_id: ownerId,
          expected_close: expectedClose,
          source: v.source || null,
          notes: v.notes || null,
          customer_id: customer?.id ?? null,
          owner_label: ownerLabel,
          customer_label: customer?.label ?? null,
        },
      };
    });
  };

  const runImport = async (records: DealImportRecord[]): Promise<string> => {
    const saved = await importDeals.mutateAsync(records);
    const linked = records.filter((r) => r.customer_id).length;
    return `${saved} ${saved === 1 ? "deal" : "deals"} imported${linked ? ` (${linked} linked to existing customers)` : ""}`;
  };

  const exportCsv = () => {
    const ownerEmail = (id: string | null) => (id ? staff.find((s) => s.id === id)?.email ?? "" : "");
    const csv = toCsv(
      ["Title", "Company", "Contact name", "Contact email", "Contact phone", "Value", "Fleet size", "Stage", "Probability", "Owner", "Owner email", "Expected close", "Source", "Notes", "Last activity"],
      filteredDeals.map((d) => [
        d.title,
        d.company,
        d.contact_name ?? "",
        d.contact_email ?? "",
        d.contact_phone ?? "",
        d.value,
        d.fleet_size ?? "",
        stageById(d.stage).label,
        d.probability,
        d.owner_id ? staffName(d.owner_id) : "",
        ownerEmail(d.owner_id),
        d.expected_close ?? "",
        d.source ?? "",
        d.notes ?? "",
        d.last_activity_at ? d.last_activity_at.slice(0, 10) : "",
      ])
    );
    downloadText(`deals-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Sales Pipeline</h1>
            <p className="text-slate-500 mt-1">Track and manage your deals from lead to close</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
            {activeInsights.length > 0 && (
              <button
                onClick={() => setShowInsights(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-violet-700 hover:to-blue-700 transition-all shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                Insights
                <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">{activeInsights.length}</span>
              </button>
            )}
            {deals.length > 0 && (
              <button
                onClick={exportCsv}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                title={searchQuery ? "Export the deals matching your search" : "Export all deals"}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Import deals
              </button>
            )}
            {canEdit && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Deal
              </button>
            )}
          </div>
        </div>
      </div>

      <ImportDialog<DealImportRecord>
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Import deals"
        description="Upload a CSV or Excel export from your CRM or spreadsheet. Deals already in the pipeline (same title and company) are skipped."
        fields={DEAL_IMPORT_FIELDS}
        templateName="deals-import-template"
        validate={validateImport}
        importRows={runImport}
        preview={[
          { label: "Title", value: (r) => r.title },
          { label: "Company", value: (r) => (r.customer_id ? `${r.company} (customer)` : r.company) },
          { label: "Value", value: (r) => formatCurrency(r.value ?? 0) },
          { label: "Stage", value: (r) => `${stageById(r.stage).label} · ${r.probability}%` },
          { label: "Owner", value: (r) => r.owner_label },
        ]}
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm text-slate-500">Loading deals...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="mt-3 text-sm font-medium text-red-700">Could not load deals</p>
          <p className="mt-1 text-xs text-red-600">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-24 text-center">
          <Target className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-lg font-medium text-slate-600">No deals yet</p>
          <p className="mt-1 text-sm text-slate-400">
            {canEdit ? "Add your first deal to start building the pipeline." : "Deals will appear here once the sales team adds them."}
          </p>
          {canEdit && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Deal
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Import deals
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-sm text-slate-500 font-medium">{metrics.activeCount} open</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.totalPipeline)}</p>
              <p className="text-sm text-slate-500 mt-1">Total Pipeline</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-sm text-slate-500 font-medium">
                  {metrics.totalPipeline > 0 ? `${Math.round((metrics.weightedPipeline / metrics.totalPipeline) * 100)}% of total` : "-"}
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
                <span className="text-sm text-slate-500 font-medium">{metrics.wonCount} won</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.totalWon)}</p>
              <p className="text-sm text-slate-500 mt-1">Revenue Won</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <span className="text-sm text-slate-500 font-medium">{metrics.closedCount} closed</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{metrics.closedCount > 0 ? `${metrics.winRate}%` : "-"}</p>
              <p className="text-sm text-slate-500 mt-1">Win Rate</p>
            </div>
          </div>

          {/* Insights strip */}
          {activeInsights.length > 0 && (
            <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Pipeline Insights</h3>
                  <span className="text-xs text-slate-500">({activeInsights.length})</span>
                </div>
                {activeInsights.length > 3 && (
                  <button onClick={() => setShowInsights(true)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                    View all &rarr;
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {activeInsights.slice(0, 3).map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onView={insight.dealId ? () => setSelectedDealId(insight.dealId) : undefined}
                    onDismiss={() => setDismissed((p) => new Set(p).add(insight.id))}
                  />
                ))}
              </div>
            </div>
          )}

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
                    onDragOver={(e) => {
                      if (!canEdit) return;
                      e.preventDefault();
                      setDragOverStage(stage.id);
                    }}
                    onDragLeave={() => setDragOverStage(null)}
                    onDrop={() => handleDrop(stage.id)}
                  >
                    {/* Stage Header */}
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-semibold", stage.color)}>{stage.label}</span>
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", stage.bgColor, stage.color)}>
                          {dealsByStage[stage.id].length}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-slate-500">{formatCurrency(stageTotal(stage.id))}</span>
                    </div>

                    {/* Deal Cards */}
                    <div className="px-2 pb-3 space-y-2 min-h-[120px]">
                      {dealsByStage[stage.id].length === 0 && (
                        <p className="px-2 py-6 text-center text-xs text-slate-400">No deals</p>
                      )}
                      {dealsByStage[stage.id].map((deal) => {
                        const openEsc = deal.escalations.filter((e) => isOpenEscalation(e.status)).length;
                        return (
                          <div
                            key={deal.id}
                            draggable={canEdit}
                            onDragStart={() => setDraggedDeal(deal.id)}
                            onDragEnd={() => {
                              setDraggedDeal(null);
                              setDragOverStage(null);
                            }}
                            onClick={() => setSelectedDealId(deal.id)}
                            className={cn(
                              "bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md transition-all hover:border-blue-200",
                              draggedDeal === deal.id && "opacity-50 scale-95"
                            )}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm font-medium text-slate-900 line-clamp-1">{deal.title}</h4>
                              {canEdit && <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />}
                            </div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs text-slate-600 truncate">{deal.company}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-900">{formatCurrency(deal.value)}</span>
                              <span
                                className={cn(
                                  "text-xs font-medium px-1.5 py-0.5 rounded",
                                  deal.probability >= 70
                                    ? "bg-emerald-100 text-emerald-700"
                                    : deal.probability >= 40
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-slate-100 text-slate-600"
                                )}
                              >
                                {deal.probability}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span className="text-xs text-slate-400">
                                  {deal.expected_close ? `Close ${formatDate(deal.expected_close)}` : "No close date"}
                                </span>
                              </div>
                              {deal.escalations.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <ArrowUpFromLine className="h-3 w-3 text-orange-500" />
                                  <span className="text-[10px] font-medium text-orange-600">
                                    {openEsc > 0 ? `${openEsc} active` : `${deal.escalations.length} closed`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                      {["Deal", "Company", "Value", "Stage", "Probability", "Expected Close", "Owner", "Source"].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDeals.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">
                          No deals match your search
                        </td>
                      </tr>
                    )}
                    {filteredDeals.map((deal) => {
                      const stageConfig = stageById(deal.stage);
                      return (
                        <tr
                          key={deal.id}
                          onClick={() => setSelectedDealId(deal.id)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-900">{deal.title}</p>
                            <p className="text-xs text-slate-500">{deal.contact_name ?? "-"}</p>
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
                                    deal.probability >= 70 ? "bg-emerald-500" : deal.probability >= 40 ? "bg-amber-500" : "bg-slate-400"
                                  )}
                                  style={{ width: `${deal.probability}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-600">{deal.probability}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {deal.expected_close ? formatDate(deal.expected_close) : "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{staffName(deal.owner_id)}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{deal.source ?? "-"}</td>
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Open Pipeline by Stage</h3>
              {metrics.activeCount === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">No open deals</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stageChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="stage" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => compactCurrency(Number(v))} width={64} />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="value" name="Total value" fill="#1e8fe0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="weighted" name="Weighted value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Deals by Source</h3>
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={280}>
                  <PieChart>
                    <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                      {sourceData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex-1">
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
        </>
      )}

      {/* Deal Detail Slide-over */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => {
              setSelectedDealId(null);
              setConfirmDelete(false);
            }}
          />
          <div className="relative bg-white w-full max-w-md shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Deal Details</h2>
              <div className="flex items-center gap-1">
                {canEdit && (
                  <button
                    onClick={() => openEdit(selectedDeal)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit deal"
                  >
                    <Pencil className="h-4 w-4 text-slate-500" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedDealId(null);
                    setConfirmDelete(false);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedDeal.title}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Created {formatDate(selectedDeal.created_at)} &middot; Owner: {staffName(selectedDeal.owner_id)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl font-bold text-slate-900">{formatCurrency(selectedDeal.value)}</span>
                {canEdit ? (
                  <select
                    value={selectedDeal.stage}
                    onChange={(e) => moveDeal(selectedDeal, e.target.value as Stage)}
                    className={cn(
                      "text-sm font-medium px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-blue-500",
                      stageById(selectedDeal.stage).bgColor,
                      stageById(selectedDeal.stage).color
                    )}
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={cn(
                      "text-sm font-medium px-2 py-1 rounded-full",
                      stageById(selectedDeal.stage).bgColor,
                      stageById(selectedDeal.stage).color
                    )}
                  >
                    {stageById(selectedDeal.stage).label}
                  </span>
                )}
              </div>

              {selectedDeal.stage === "closed_won" && !selectedDeal.customer_id && canEdit && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm text-emerald-800">This deal is won but not linked to a customer yet.</p>
                  <button
                    onClick={() => setConvertDealId(selectedDeal.id)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Create customer &amp; start onboarding
                  </button>
                </div>
              )}
              {selectedDeal.customer_id && (
                <p className="flex items-center gap-2 text-xs text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Linked to a customer record
                </p>
              )}

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Contact</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{selectedDeal.company}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{selectedDeal.contact_name ?? "-"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {selectedDeal.contact_email ? (
                      <a href={`mailto:${selectedDeal.contact_email}`} className="text-sm text-blue-600 hover:underline">
                        {selectedDeal.contact_email}
                      </a>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{selectedDeal.contact_phone ?? "-"}</span>
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
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedDeal.expected_close ? formatDate(selectedDeal.expected_close) : "-"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Source</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedDeal.source ?? "-"}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-slate-500">Fleet Size</p>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <Car className="h-4 w-4 text-slate-400" />
                      {selectedDeal.fleet_size != null ? `${selectedDeal.fleet_size} vehicles` : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {selectedDeal.notes && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Notes</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-line">{selectedDeal.notes}</p>
                </div>
              )}

              {/* Documents Section */}
              <RecordFiles
                key={selectedDeal.id}
                area="deal"
                entityId={selectedDeal.id}
                canEdit={canEdit}
                title="Documents"
                emptyText={canEdit ? "No documents yet. Attach quotes, proposals or signed contracts." : "No documents attached."}
              />

              {/* Escalations Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ArrowUpFromLine className="h-4 w-4 text-orange-500" />
                    Escalations
                    {selectedDeal.escalations.length > 0 && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 normal-case">
                        {selectedDeal.escalations.length}
                      </span>
                    )}
                  </h4>
                  {canEdit && !isClosed(selectedDeal) && (
                    <button
                      onClick={() => setShowEscalateModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors"
                    >
                      <ArrowUpFromLine className="h-3.5 w-3.5" />
                      Escalate
                    </button>
                  )}
                </div>

                {selectedDeal.escalations.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No escalations for this deal</p>
                )}

                {selectedDeal.escalations.map((esc) => (
                  <div key={esc.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {esc.dept === "technical" && <Wrench className="h-3.5 w-3.5 text-blue-600" />}
                        {esc.dept === "finance" && <DollarSign className="h-3.5 w-3.5 text-emerald-600" />}
                        {esc.dept === "management" && <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />}
                        <span className="text-xs font-semibold text-slate-700">{escalationConfig[esc.dept].label}</span>
                      </div>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase", getEscalationStatusStyle(esc.status))}>
                        {getEscalationStatusLabel(esc.status)}
                      </span>
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-slate-600 leading-relaxed">{esc.reason}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        {esc.created_by && (
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            {esc.created_by}
                          </span>
                        )}
                        <span>{formatDate(esc.created_at)}</span>
                      </div>
                      {(esc.response_note || esc.resolved_at) && (
                        <div
                          className={cn(
                            "mt-2 p-2 rounded text-xs leading-relaxed",
                            esc.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : esc.status === "rejected"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                          )}
                        >
                          <p className="font-medium mb-0.5">
                            {esc.status === "approved" ? "Approved" : esc.status === "rejected" ? "Rejected" : "Response"}
                            {esc.resolved_by && ` by ${esc.resolved_by}`}
                            {esc.resolved_at && ` on ${formatDate(esc.resolved_at)}`}
                            {esc.response_note ? ":" : ""}
                          </p>
                          {esc.response_note && <p>{esc.response_note}</p>}
                        </div>
                      )}
                      {canEdit && isOpenEscalation(esc.status) && (
                        <div className="space-y-2 mt-2">
                          <input
                            type="text"
                            value={responseNotes[esc.id] ?? ""}
                            onChange={(e) => setResponseNotes((p) => ({ ...p, [esc.id]: e.target.value }))}
                            placeholder="Response note (optional)"
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="flex gap-2">
                            {esc.status === "pending" && (
                              <button
                                disabled={updateEscalation.isPending}
                                onClick={() => setEscalationStatus(selectedDeal.id, esc.id, "in_review")}
                                className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                              >
                                <CircleDot className="h-3 w-3" />
                                Mark In Review
                              </button>
                            )}
                            <button
                              disabled={updateEscalation.isPending}
                              onClick={() => setEscalationStatus(selectedDeal.id, esc.id, "approved")}
                              className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Approve
                            </button>
                            <button
                              disabled={updateEscalation.isPending}
                              onClick={() => setEscalationStatus(selectedDeal.id, esc.id, "rejected")}
                              className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-[11px] font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              <X className="h-3 w-3" />
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-slate-400">Last activity: {formatDate(selectedDeal.last_activity_at)}</div>

              {canEdit && (
                <div className="border-t border-slate-200 pt-4">
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 flex-1">Delete this deal permanently?</span>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleteDeal.isPending}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleteDeal.isPending ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete deal
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Escalation Modal */}
      {showEscalateModal && selectedDeal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeEscalate} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Escalate Deal</h2>
                <p className="text-xs text-white/80">
                  {selectedDeal.title} &mdash; {selectedDeal.company}
                </p>
              </div>
              <button onClick={closeEscalate} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Escalate to *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["technical", "finance", "management"] as EscalationDept[]).map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setEscalateDept(dept)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center",
                        escalateDept === dept
                          ? dept === "technical"
                            ? "border-blue-500 bg-blue-50"
                            : dept === "finance"
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-purple-500 bg-purple-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      {dept === "technical" && <Wrench className={cn("h-5 w-5", escalateDept === dept ? "text-blue-600" : "text-slate-400")} />}
                      {dept === "finance" && <BriefcaseBusiness className={cn("h-5 w-5", escalateDept === dept ? "text-emerald-600" : "text-slate-400")} />}
                      {dept === "management" && <ShieldCheck className={cn("h-5 w-5", escalateDept === dept ? "text-purple-600" : "text-slate-400")} />}
                      <span className={cn("text-xs font-medium", escalateDept === dept ? "text-slate-900" : "text-slate-500")}>
                        {escalationConfig[dept].label}
                      </span>
                    </button>
                  ))}
                </div>
                {escalateDept && (
                  <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg p-2">{escalationConfig[escalateDept].description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Escalation *</label>
                <textarea
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder={
                    escalateDept === "technical"
                      ? "Describe the technical requirement or challenge..."
                      : escalateDept === "finance"
                        ? "Describe the pricing, discount, or payment terms request..."
                        : escalateDept === "management"
                          ? "Describe why executive involvement is needed..."
                          : "Select a department first, then describe the reason..."
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
                {profile && <p className="mt-1 text-xs text-slate-400">Requested by {profile.name}</p>}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeEscalate}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEscalate}
                  disabled={!escalateDept || !escalateReason.trim() || addEscalation.isPending}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg text-sm font-medium hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ArrowUpFromLine className="h-4 w-4" />
                  {addEscalation.isPending ? "Submitting..." : "Submit Escalation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Deal Modal */}
      {formMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setFormMode(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-semibold text-slate-900">{formMode === "create" ? "Add New Deal" : "Edit Deal"}</h2>
              <button onClick={() => setFormMode(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveDeal();
              }}
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deal Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Fleet GPS Installation"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
                  <input
                    type="text"
                    required
                    value={form.company}
                    onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                    placeholder="Company name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                    placeholder="Full name"
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                    placeholder="email@company.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))}
                    placeholder="+264 61 ..."
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deal Value (N$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fleet Size</label>
                  <input
                    type="number"
                    min="0"
                    value={form.fleet_size}
                    onChange={(e) => setForm((p) => ({ ...p, fleet_size: e.target.value }))}
                    placeholder="Vehicles"
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stage</label>
                  <select
                    value={form.stage}
                    onChange={(e) => {
                      const stage = e.target.value as Stage;
                      setForm((p) => ({ ...p, stage, probability: String(STAGE_PROBABILITY[stage]) }));
                    }}
                    className={inputCls}
                  >
                    {(formMode === "create" ? ACTIVE_STAGES : stages).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.probability}
                    onChange={(e) => setForm((p) => ({ ...p, probability: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={form.expected_close}
                    onChange={(e) => setForm((p) => ({ ...p, expected_close: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Not set</option>
                    {[...new Set([...SOURCES, ...(form.source ? [form.source] : [])])].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Owner</label>
                <select
                  value={form.owner_id}
                  onChange={(e) => setForm((p) => ({ ...p, owner_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Any relevant details about this deal..."
                  rows={3}
                  className={cn(inputCls, "resize-none")}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormMode(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!form.title.trim() || !form.company.trim() || saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : formMode === "create" ? "Add Deal" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Won deal: create customer + onboarding */}
      {convertCandidate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConvertDealId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Deal won</h2>
                <p className="mt-1 text-sm text-slate-600">
                  &ldquo;{convertCandidate.title}&rdquo; is not linked to a customer. Create a customer record for{" "}
                  <span className="font-medium">{convertCandidate.company}</span> from the deal&apos;s contact details and start
                  their onboarding?
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConvertDealId(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Not now
              </button>
              <button
                onClick={() => convertDeal.mutate(convertCandidate, { onSuccess: () => setConvertDealId(null) })}
                disabled={convertDeal.isPending}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                {convertDeal.isPending ? "Creating..." : "Create customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insights Panel */}
      {showInsights && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowInsights(false)} />
          <div className="relative bg-white w-full max-w-lg shadow-xl flex flex-col h-full">
            <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Pipeline Insights</h2>
                  <p className="text-xs text-white/70">Reminders and risks found in your deals</p>
                </div>
              </div>
              <button onClick={() => setShowInsights(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Insights</h3>
                  <span className="text-xs text-slate-500">({activeInsights.length})</span>
                </div>
                {activeInsights.length === 0 && (
                  <p className="text-sm text-slate-500 p-3">Nothing needs your attention right now.</p>
                )}
                <div className="space-y-2">
                  {activeInsights.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      onView={
                        insight.dealId
                          ? () => {
                              setSelectedDealId(insight.dealId);
                              setShowInsights(false);
                            }
                          : undefined
                      }
                      onDismiss={() => setDismissed((p) => new Set(p).add(insight.id))}
                    />
                  ))}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Pipeline Health</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Avg. Open Deal Size</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(metrics.avgDealSize)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Pipeline Coverage</p>
                    <p className="text-lg font-bold text-slate-900">
                      {metrics.totalWon > 0 ? `${(metrics.totalPipeline / metrics.totalWon).toFixed(1)}x` : "N/A"}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Idle {STALE_DAYS}+ Days</p>
                    <p className="text-lg font-bold text-slate-900">{metrics.followUps}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Closing This Month</p>
                    <p className="text-lg font-bold text-slate-900">{metrics.closingThisMonth}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insight card
// ---------------------------------------------------------------------------

function InsightCard({
  insight,
  onView,
  onDismiss,
}: {
  insight: Insight;
  onView?: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
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
            {onView && (
              <button onClick={onView} className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                View Deal &rarr;
              </button>
            )}
          </div>
        </div>
        <button onClick={onDismiss} className="p-1 hover:bg-white/50 rounded transition-colors flex-shrink-0" title="Dismiss">
          <X className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
