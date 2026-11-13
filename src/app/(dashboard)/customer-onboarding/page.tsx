"use client";

import { useState } from "react";
import {
  UserCheck,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Plus,
  X,
  Building2,
  Car,
  Cpu,
  GraduationCap,
  Rocket,
  Phone,
  Mail,
  ChevronRight,
  CircleDot,
  CalendarClock,
  Package,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useAuth } from "@/components/providers/session-provider";
import { useCustomers } from "@/lib/hooks/use-customers";
import { useStaff } from "@/lib/hooks/use-deals";
import {
  useOnboardings,
  useCreateOnboarding,
  useUpdateOnboarding,
  useToggleOnboardingStage,
  useDeleteOnboarding,
  ONBOARDING_STAGES,
  isStageDone,
  completedStageCount,
  currentStageFor,
  type Onboarding,
} from "@/lib/hooks/use-onboarding";
import type { OnboardingStage, OnboardingStatus } from "@/lib/supabase/database.types";

const stageMeta: Record<OnboardingStage, { label: string; icon: typeof UserCheck }> = {
  INQUIRY: { label: "Inquiry", icon: Phone },
  PROPOSAL: { label: "Proposal", icon: Building2 },
  CONTRACT: { label: "Contract", icon: CheckCircle2 },
  INSTALLATION: { label: "Installation", icon: Car },
  CONFIGURATION: { label: "Configuration", icon: Cpu },
  TRAINING: { label: "Training", icon: GraduationCap },
  GO_LIVE: { label: "Go-Live", icon: Rocket },
};
const stages = ONBOARDING_STAGES.map((key) => ({ key, ...stageMeta[key] }));

const STATUSES: OnboardingStatus[] = ["IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"];
const statusFilters = ["All", "In Progress", "Completed", "On Hold", "Cancelled"] as const;
const filterMap: Record<string, OnboardingStatus | "All"> = {
  All: "All",
  "In Progress": "IN_PROGRESS",
  Completed: "COMPLETED",
  "On Hold": "ON_HOLD",
  Cancelled: "CANCELLED",
};

function getOnboardingStatusColor(status: OnboardingStatus): string {
  const colors: Record<OnboardingStatus, string> = {
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    ON_HOLD: "bg-yellow-100 text-yellow-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return colors[status];
}

function getStageProgress(o: Onboarding): number {
  return Math.round((completedStageCount(o.checklist) / stages.length) * 100);
}

function formatStatusLabel(status: OnboardingStatus): string {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Keeps completed_at in step with the status. */
function statusPatch(o: Onboarding, status: OnboardingStatus) {
  return {
    status,
    completed_at: status === "COMPLETED" ? o.completed_at ?? new Date().toISOString() : null,
  };
}

const customerLabel = (o: Onboarding) => o.customer?.name ?? "Unknown customer";

type FormState = {
  customer_id: string;
  vehicle_count: string;
  package: string;
  assigned_to_id: string;
  target_date: string;
  notes: string;
  status: OnboardingStatus;
};

const emptyForm = (assignee: string): FormState => ({
  customer_id: "",
  vehicle_count: "",
  package: "",
  assigned_to_id: assignee,
  target_date: "",
  notes: "",
  status: "IN_PROGRESS",
});

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white";

export default function CustomerOnboardingPage() {
  const { profile } = useAuth();
  const canEdit = !!profile && profile.role !== "VIEWER" && profile.role !== "CLIENT";

  const { data: onboardings = [], isLoading, error, refetch } = useOnboardings();
  const { data: customers = [] } = useCustomers();
  const { data: staff = [] } = useStaff();
  const createOnboarding = useCreateOnboarding();
  const updateOnboarding = useUpdateOnboarding();
  const toggleStage = useToggleOnboardingStage();
  const deleteOnboarding = useDeleteOnboarding();

  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm(""));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selected = onboardings.find((o) => o.id === selectedId) ?? null;
  const staffName = (id: string | null) => (id ? staff.find((s) => s.id === id)?.name ?? "Unknown" : "Unassigned");

  const filteredWorkflows = (() => {
    const query = searchQuery.toLowerCase();
    return onboardings.filter((wf) => {
      const wanted = filterMap[statusFilter];
      const matchesStatus = wanted === "All" || wf.status === wanted;
      const assignee = wf.assigned_to_id ? staff.find((s) => s.id === wf.assigned_to_id)?.name ?? "" : "";
      const matchesSearch =
        query === "" ||
        customerLabel(wf).toLowerCase().includes(query) ||
        (wf.customer?.company ?? "").toLowerCase().includes(query) ||
        (wf.package ?? "").toLowerCase().includes(query) ||
        assignee.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  })();

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openCreate = () => {
    setFormData(emptyForm(profile?.id ?? ""));
    setFormMode("create");
  };

  const openEdit = (o: Onboarding) => {
    setFormData({
      customer_id: o.customer_id,
      vehicle_count: o.vehicle_count != null ? String(o.vehicle_count) : "",
      package: o.package ?? "",
      assigned_to_id: o.assigned_to_id ?? "",
      target_date: o.target_date ?? "",
      notes: o.notes ?? "",
      status: o.status,
    });
    setFormMode("edit");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const common = {
      vehicle_count: formData.vehicle_count ? Math.max(0, Math.round(Number(formData.vehicle_count))) : null,
      package: formData.package.trim() || null,
      assigned_to_id: formData.assigned_to_id || null,
      target_date: formData.target_date || null,
      notes: formData.notes.trim() || null,
    };
    if (formMode === "create") {
      if (!formData.customer_id) return;
      createOnboarding.mutate({ customer_id: formData.customer_id, ...common }, { onSuccess: () => setFormMode(null) });
    } else if (formMode === "edit" && selected) {
      updateOnboarding.mutate({ id: selected.id, ...common, ...statusPatch(selected, formData.status) }, {
        onSuccess: () => setFormMode(null),
      });
    }
  };

  const setStatus = (o: Onboarding, status: OnboardingStatus) => {
    if (o.status === status) return;
    updateOnboarding.mutate({ id: o.id, ...statusPatch(o, status) });
  };

  const advance = (o: Onboarding) => {
    const next = currentStageFor(o.checklist);
    if (isStageDone(o.checklist, next)) return;
    toggleStage.mutate({ onboarding: o, stage: next, done: true });
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteOnboarding.mutate(selected.id, {
      onSuccess: () => {
        setSelectedId(null);
        setConfirmDelete(false);
      },
    });
  };

  const closeDrawer = () => {
    setSelectedId(null);
    setConfirmDelete(false);
  };

  // Customers that do not already have an open onboarding.
  const availableCustomers = (() => {
    const open = new Set(
      onboardings.filter((o) => o.status === "IN_PROGRESS" || o.status === "ON_HOLD").map((o) => o.customer_id)
    );
    return customers.filter((c) => !open.has(c.id));
  })();

  const stats = [
    {
      label: "Active Onboardings",
      value: onboardings.filter((w) => w.status === "IN_PROGRESS").length.toString(),
      icon: Clock,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Completed",
      value: onboardings.filter((w) => w.status === "COMPLETED").length.toString(),
      icon: CheckCircle2,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "On Hold",
      value: onboardings.filter((w) => w.status === "ON_HOLD").length.toString(),
      icon: AlertCircle,
      color: "text-yellow-600 bg-yellow-50",
    },
    {
      label: "Vehicles Pending",
      value: onboardings
        .filter((w) => w.status === "IN_PROGRESS" || w.status === "ON_HOLD")
        .reduce((sum, w) => sum + (w.vehicle_count ?? 0), 0)
        .toString(),
      icon: Car,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  const saving = createOnboarding.isPending || updateOnboarding.isPending;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Onboarding</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage the client onboarding pipeline from inquiry to go-live
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            New Onboarding
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-24 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm text-gray-500">Loading onboardings...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="mt-3 text-sm font-medium text-red-700">Could not load onboardings</p>
          <p className="mt-1 text-xs text-red-600">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={cn("rounded-lg p-3", stat.color)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Workflow Pipeline Overview */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Pipeline Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {stages.map((stage) => {
                const count = onboardings.filter(
                  (w) => w.stage === stage.key && w.status !== "COMPLETED" && w.status !== "CANCELLED"
                ).length;
                const StageIcon = stage.icon;
                return (
                  <div
                    key={stage.key}
                    className="flex flex-col items-center rounded-lg border border-gray-100 bg-gray-50 p-3 text-center"
                  >
                    <StageIcon className="mb-1.5 h-5 w-5 text-gray-500" />
                    <p className="text-xs font-medium text-gray-700">{stage.label}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter / Search Bar */}
          <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    statusFilter === filter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search onboardings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Workflow Cards */}
          {filteredWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
              <UserCheck className="mb-3 h-12 w-12 text-gray-300" />
              {onboardings.length === 0 ? (
                <>
                  <p className="text-lg font-medium text-gray-500">No onboardings yet</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {canEdit
                      ? "Start an onboarding for a customer, or win a deal in the sales pipeline."
                      : "Onboardings will appear here once the team starts them."}
                  </p>
                  {canEdit && (
                    <button
                      onClick={openCreate}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      New Onboarding
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-lg font-medium text-gray-500">No onboardings found</p>
                  <p className="mt-1 text-sm text-gray-400">Try adjusting your filters or search query</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWorkflows.map((workflow) => {
                const progress = getStageProgress(workflow);
                const done = completedStageCount(workflow.checklist);
                const currentStageData = stageMeta[workflow.stage];
                const CurrentIcon = currentStageData?.icon || CircleDot;
                const overdue =
                  workflow.target_date &&
                  workflow.status === "IN_PROGRESS" &&
                  new Date(workflow.target_date) < new Date(new Date().toDateString());

                return (
                  <div
                    key={workflow.id}
                    className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{customerLabel(workflow)}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                            {workflow.customer?.company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {workflow.customer.company}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Car className="h-3.5 w-3.5" />
                              {workflow.vehicle_count ?? 0} vehicles
                            </span>
                            {workflow.package && (
                              <span className="flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" />
                                {workflow.package}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {staffName(workflow.assigned_to_id)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-sm">
                            <CurrentIcon className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-gray-700">{currentStageData?.label}</span>
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              getOnboardingStatusColor(workflow.status)
                            )}
                          >
                            {formatStatusLabel(workflow.status)}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            Progress: {done}/{stages.length} stages
                          </span>
                          <span className="font-medium text-gray-700">{progress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              workflow.status === "COMPLETED"
                                ? "bg-green-500"
                                : workflow.status === "ON_HOLD"
                                  ? "bg-yellow-500"
                                  : workflow.status === "CANCELLED"
                                    ? "bg-gray-400"
                                    : "bg-blue-500"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Stage Dots */}
                      <div className="mt-3 flex items-center gap-1 overflow-x-auto">
                        {stages.map((stage, idx) => {
                          const isCompleted = isStageDone(workflow.checklist, stage.key);
                          const isCurrent = workflow.stage === stage.key && workflow.status !== "COMPLETED";
                          return (
                            <div key={stage.key} className="flex items-center">
                              <div
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                                  isCompleted
                                    ? "bg-green-100 text-green-700"
                                    : isCurrent
                                      ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300"
                                      : "bg-gray-100 text-gray-400"
                                )}
                                title={stage.label}
                              >
                                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                              </div>
                              {idx < stages.length - 1 && (
                                <div className={cn("h-0.5 w-4 sm:w-6", isCompleted ? "bg-green-300" : "bg-gray-200")} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          Started {formatDate(workflow.started_at)}
                        </span>
                        {workflow.target_date && (
                          <span className={cn("flex items-center gap-1", overdue && "text-red-600")}>
                            <Rocket className="h-3.5 w-3.5" />
                            Target {formatDate(workflow.target_date)}
                            {overdue && " (overdue)"}
                          </span>
                        )}
                        {workflow.completed_at && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completed {formatDate(workflow.completed_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {canEdit && workflow.status === "IN_PROGRESS" && (
                          <button
                            onClick={() => advance(workflow)}
                            disabled={toggleStage.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
                            title={`Mark ${stageMeta[currentStageFor(workflow.checklist)].label} as done`}
                          >
                            Complete {stageMeta[currentStageFor(workflow.checklist)].label}
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedId(workflow.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          View Details
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={closeDrawer}>
          <div className="w-full max-w-lg overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{customerLabel(selected)}</h2>
                {selected.customer?.company && <p className="text-sm text-gray-500">{selected.customer.company}</p>}
              </div>
              <div className="flex items-center gap-1">
                {canEdit && (
                  <button
                    onClick={() => openEdit(selected)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Edit onboarding"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={closeDrawer}
                  className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6 px-6 py-5">
              {/* Status */}
              <div className="flex flex-wrap items-center gap-3">
                {canEdit ? (
                  <select
                    value={selected.status}
                    onChange={(e) => setStatus(selected, e.target.value as OnboardingStatus)}
                    disabled={updateOnboarding.isPending}
                    className={cn(
                      "rounded-full border-0 px-3 py-1 text-sm font-medium focus:ring-2 focus:ring-blue-500",
                      getOnboardingStatusColor(selected.status)
                    )}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {formatStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
                      getOnboardingStatusColor(selected.status)
                    )}
                  >
                    {formatStatusLabel(selected.status)}
                  </span>
                )}
                <span className="text-sm text-gray-500">{getStageProgress(selected)}% complete</span>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wider">Contact</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    {selected.customer?.company ?? customerLabel(selected)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {selected.customer?.email ? (
                      <a href={`mailto:${selected.customer.email}`} className="text-blue-600 hover:underline">
                        {selected.customer.email}
                      </a>
                    ) : (
                      "-"
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {selected.customer?.phone ?? "-"}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wider">Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Vehicles</p>
                    <p className="text-lg font-bold text-gray-900">{selected.vehicle_count ?? "-"}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Assigned To</p>
                    <p className="text-sm font-semibold text-gray-900">{staffName(selected.assigned_to_id)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(selected.started_at)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Target Go-Live</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selected.target_date ? formatDate(selected.target_date) : "-"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Package</p>
                    <p className="text-sm font-semibold text-gray-900">{selected.package ?? "-"}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Completed</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selected.completed_at ? formatDate(selected.completed_at) : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Workflow Stages Checklist */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wider">Workflow Stages</h3>
                <div className="space-y-0">
                  {stages.map((stage, idx) => {
                    const entry = selected.checklist[stage.key];
                    const isCompleted = entry?.done === true;
                    const isCurrent = selected.stage === stage.key && selected.status !== "COMPLETED";
                    const StageIcon = stage.icon;

                    return (
                      <div key={stage.key} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            disabled={!canEdit || toggleStage.isPending}
                            onClick={() => toggleStage.mutate({ onboarding: selected, stage: stage.key, done: !isCompleted })}
                            title={canEdit ? (isCompleted ? `Untick ${stage.label}` : `Mark ${stage.label} as done`) : stage.label}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                              canEdit && "hover:ring-2 hover:ring-blue-200 cursor-pointer",
                              !canEdit && "cursor-default",
                              isCompleted
                                ? "bg-green-100 text-green-600"
                                : isCurrent
                                  ? "bg-blue-100 text-blue-600 ring-2 ring-blue-300"
                                  : "bg-gray-100 text-gray-400"
                            )}
                          >
                            {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <StageIcon className="h-4 w-4" />}
                          </button>
                          {idx < stages.length - 1 && (
                            <div className={cn("w-0.5 flex-1 min-h-[24px]", isCompleted ? "bg-green-200" : "bg-gray-200")} />
                          )}
                        </div>
                        <div className="pb-4">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isCompleted ? "text-green-700" : isCurrent ? "text-blue-700" : "text-gray-400"
                            )}
                          >
                            {stage.label}
                          </p>
                          {isCurrent && !isCompleted && <p className="text-xs text-blue-500">Current stage</p>}
                          {isCompleted && (
                            <p className="text-xs text-green-500">
                              Completed{entry?.at ? ` ${formatDate(entry.at)}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {canEdit && <p className="text-xs text-gray-400">Click a stage to tick or untick it.</p>}
              </div>

              {/* Notes */}
              {selected.notes && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wider">Notes</h3>
                  <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 whitespace-pre-line">{selected.notes}</p>
                </div>
              )}

              {canEdit && (
                <div className="border-t border-gray-200 pt-4">
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm text-gray-600">Delete this onboarding record?</span>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleteOnboarding.isPending}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleteOnboarding.isPending ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete onboarding
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Onboarding Modal */}
      {formMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {formMode === "create" ? "New Customer Onboarding" : "Edit Onboarding"}
              </h2>
              <button
                onClick={() => setFormMode(null)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  {formMode === "create" ? (
                    <>
                      <select
                        name="customer_id"
                        required
                        value={formData.customer_id}
                        onChange={handleFormChange}
                        className={inputCls}
                      >
                        <option value="">Select a customer</option>
                        {availableCustomers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.company && c.company !== c.name ? ` (${c.company})` : ""}
                          </option>
                        ))}
                      </select>
                      {availableCustomers.length === 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          Every customer already has an open onboarding. Add a customer first on the Customers page.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      {selected ? customerLabel(selected) : "-"}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Fleet Size (vehicles)</label>
                    <input
                      type="number"
                      name="vehicle_count"
                      min="0"
                      value={formData.vehicle_count}
                      onChange={handleFormChange}
                      placeholder="Number of vehicles"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Package</label>
                    <input
                      type="text"
                      name="package"
                      value={formData.package}
                      onChange={handleFormChange}
                      placeholder="e.g. Fleet tracking + fuel"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Assigned To</label>
                    <select name="assigned_to_id" value={formData.assigned_to_id} onChange={handleFormChange} className={inputCls}>
                      <option value="">Unassigned</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Target Go-Live Date</label>
                    <input
                      type="date"
                      name="target_date"
                      value={formData.target_date}
                      onChange={handleFormChange}
                      className={inputCls}
                    />
                  </div>
                </div>

                {formMode === "edit" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                    <select name="status" value={formData.status} onChange={handleFormChange} className={inputCls}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {formatStatusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleFormChange}
                    placeholder="Requirements, special considerations..."
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setFormMode(null)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || (formMode === "create" && !formData.customer_id)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {saving ? "Saving..." : formMode === "create" ? "Start Onboarding" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
