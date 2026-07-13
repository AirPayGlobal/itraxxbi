"use client";

import { useState, useMemo } from "react";
import {
  UserCheck,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
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
  ArrowRight,
  CircleDot,
  CalendarClock,
  TrendingUp,
} from "lucide-react";
import { cn, getStatusColor, formatDate } from "@/lib/utils";
import { toast } from "sonner";

type WorkflowStage =
  | "INQUIRY"
  | "PROPOSAL"
  | "CONTRACT"
  | "INSTALLATION"
  | "CONFIGURATION"
  | "TRAINING"
  | "GO_LIVE";

type OnboardingStatus = "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "CANCELLED";

interface OnboardingWorkflow {
  id: string;
  customerName: string;
  company: string;
  email: string;
  phone: string;
  vehicleCount: number;
  currentStage: WorkflowStage;
  status: OnboardingStatus;
  assignedTo: string;
  startDate: string;
  targetGoLive: string;
  completedDate: string | null;
  notes: string;
  stagesCompleted: WorkflowStage[];
}

const stages: { key: WorkflowStage; label: string; icon: typeof UserCheck }[] = [
  { key: "INQUIRY", label: "Inquiry", icon: Phone },
  { key: "PROPOSAL", label: "Proposal", icon: Building2 },
  { key: "CONTRACT", label: "Contract", icon: CheckCircle2 },
  { key: "INSTALLATION", label: "Installation", icon: Car },
  { key: "CONFIGURATION", label: "Configuration", icon: Cpu },
  { key: "TRAINING", label: "Training", icon: GraduationCap },
  { key: "GO_LIVE", label: "Go-Live", icon: Rocket },
];

const stageIndex = (stage: WorkflowStage) =>
  stages.findIndex((s) => s.key === stage);

const initialWorkflows: OnboardingWorkflow[] = [
  {
    id: "ONB-001",
    customerName: "Namibia Breweries Ltd",
    company: "NBL Group",
    email: "fleet@nbl.com.na",
    phone: "+264 61 320 4999",
    vehicleCount: 18,
    currentStage: "GO_LIVE",
    status: "COMPLETED",
    assignedTo: "Johannes H.",
    startDate: "2025-11-01",
    targetGoLive: "2026-01-15",
    completedDate: "2026-01-10",
    notes: "Smooth onboarding. Client very satisfied with installation quality.",
    stagesCompleted: ["INQUIRY", "PROPOSAL", "CONTRACT", "INSTALLATION", "CONFIGURATION", "TRAINING", "GO_LIVE"],
  },
  {
    id: "ONB-002",
    customerName: "TransNamib Holdings",
    company: "TransNamib",
    email: "ops@transnamib.com.na",
    phone: "+264 61 298 2032",
    vehicleCount: 45,
    currentStage: "INSTALLATION",
    status: "IN_PROGRESS",
    assignedTo: "Maria S.",
    startDate: "2026-01-15",
    targetGoLive: "2026-04-01",
    completedDate: null,
    notes: "Large fleet — installation in batches of 15. Batch 1 complete.",
    stagesCompleted: ["INQUIRY", "PROPOSAL", "CONTRACT"],
  },
  {
    id: "ONB-003",
    customerName: "Pupkewitz Motors",
    company: "Pupkewitz Group",
    email: "fleet@pupkewitz.com",
    phone: "+264 61 224 081",
    vehicleCount: 22,
    currentStage: "TRAINING",
    status: "IN_PROGRESS",
    assignedTo: "Johannes H.",
    startDate: "2026-01-20",
    targetGoLive: "2026-03-30",
    completedDate: null,
    notes: "Training sessions scheduled for next week with fleet managers.",
    stagesCompleted: ["INQUIRY", "PROPOSAL", "CONTRACT", "INSTALLATION", "CONFIGURATION"],
  },
  {
    id: "ONB-004",
    customerName: "Ohlthaver & List",
    company: "O&L Group",
    email: "transport@ol.na",
    phone: "+264 61 207 5111",
    vehicleCount: 35,
    currentStage: "CONFIGURATION",
    status: "IN_PROGRESS",
    assignedTo: "Peter K.",
    startDate: "2026-02-01",
    targetGoLive: "2026-04-15",
    completedDate: null,
    notes: "Complex geofencing requirements for multiple depots across Namibia.",
    stagesCompleted: ["INQUIRY", "PROPOSAL", "CONTRACT", "INSTALLATION"],
  },
  {
    id: "ONB-005",
    customerName: "Namibia Logistics",
    company: "NamLog",
    email: "info@namlog.com.na",
    phone: "+264 61 215 774",
    vehicleCount: 30,
    currentStage: "PROPOSAL",
    status: "IN_PROGRESS",
    assignedTo: "Maria S.",
    startDate: "2026-03-10",
    targetGoLive: "2026-06-01",
    completedDate: null,
    notes: "Interested in full fleet package with fuel monitoring add-on.",
    stagesCompleted: ["INQUIRY"],
  },
  {
    id: "ONB-006",
    customerName: "Meat Corp Namibia",
    company: "MeatCo",
    email: "logistics@meatco.com.na",
    phone: "+264 61 321 200",
    vehicleCount: 28,
    currentStage: "CONTRACT",
    status: "ON_HOLD",
    assignedTo: "Johannes H.",
    startDate: "2026-02-15",
    targetGoLive: "2026-05-01",
    completedDate: null,
    notes: "Awaiting board approval for budget allocation. Follow up end of March.",
    stagesCompleted: ["INQUIRY", "PROPOSAL"],
  },
  {
    id: "ONB-007",
    customerName: "Bank Windhoek",
    company: "Capricorn Group",
    email: "fleet@bankwindhoek.com.na",
    phone: "+264 61 299 1234",
    vehicleCount: 12,
    currentStage: "GO_LIVE",
    status: "COMPLETED",
    assignedTo: "Peter K.",
    startDate: "2025-12-01",
    targetGoLive: "2026-02-15",
    completedDate: "2026-02-12",
    notes: "Completed ahead of schedule. Client requested additional driver behaviour reports.",
    stagesCompleted: ["INQUIRY", "PROPOSAL", "CONTRACT", "INSTALLATION", "CONFIGURATION", "TRAINING", "GO_LIVE"],
  },
  {
    id: "ONB-008",
    customerName: "FNB Namibia",
    company: "FirstRand",
    email: "ops@fnbnamibia.com.na",
    phone: "+264 61 299 2222",
    vehicleCount: 15,
    currentStage: "INQUIRY",
    status: "IN_PROGRESS",
    assignedTo: "Maria S.",
    startDate: "2026-03-18",
    targetGoLive: "2026-06-30",
    completedDate: null,
    notes: "Initial meeting held. Requesting demo of platform next week.",
    stagesCompleted: [],
  },
];

const statusFilters = ["All", "In Progress", "Completed", "On Hold", "Cancelled"] as const;

function getOnboardingStatusColor(status: OnboardingStatus): string {
  const colors: Record<OnboardingStatus, string> = {
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    ON_HOLD: "bg-yellow-100 text-yellow-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return colors[status];
}

function getStageProgress(workflow: OnboardingWorkflow): number {
  return Math.round((workflow.stagesCompleted.length / stages.length) * 100);
}

function formatStatusLabel(status: OnboardingStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CustomerOnboardingPage() {
  const [workflows, setWorkflows] = useState<OnboardingWorkflow[]>(initialWorkflows);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState<OnboardingWorkflow | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    company: "",
    email: "",
    phone: "",
    vehicleCount: "",
    assignedTo: "",
    targetGoLive: "",
    notes: "",
  });

  const filteredWorkflows = useMemo(() => {
    return workflows.filter((wf) => {
      const filterMap: Record<string, string> = {
        "All": "All",
        "In Progress": "IN_PROGRESS",
        "Completed": "COMPLETED",
        "On Hold": "ON_HOLD",
        "Cancelled": "CANCELLED",
      };
      const matchesStatus =
        statusFilter === "All" || wf.status === filterMap[statusFilter];

      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === "" ||
        wf.customerName.toLowerCase().includes(query) ||
        wf.company.toLowerCase().includes(query) ||
        wf.id.toLowerCase().includes(query) ||
        wf.assignedTo.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [workflows, statusFilter, searchQuery]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newWorkflow: OnboardingWorkflow = {
      id: `ONB-${String(workflows.length + 1).padStart(3, "0")}`,
      customerName: formData.customerName,
      company: formData.company,
      email: formData.email,
      phone: formData.phone,
      vehicleCount: Number(formData.vehicleCount),
      currentStage: "INQUIRY",
      status: "IN_PROGRESS",
      assignedTo: formData.assignedTo,
      startDate: new Date().toISOString().split("T")[0],
      targetGoLive: formData.targetGoLive || new Date().toISOString().split("T")[0],
      completedDate: null,
      notes: formData.notes,
      stagesCompleted: [],
    };
    setWorkflows((prev) => [...prev, newWorkflow]);
    toast.success("Onboarding started");
    setShowNewModal(false);
    setFormData({
      customerName: "",
      company: "",
      email: "",
      phone: "",
      vehicleCount: "",
      assignedTo: "",
      targetGoLive: "",
      notes: "",
    });
  };

  const stats = [
    {
      label: "Active Onboardings",
      value: workflows.filter((w) => w.status === "IN_PROGRESS").length.toString(),
      icon: Clock,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Completed",
      value: workflows.filter((w) => w.status === "COMPLETED").length.toString(),
      icon: CheckCircle2,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "On Hold",
      value: workflows.filter((w) => w.status === "ON_HOLD").length.toString(),
      icon: AlertCircle,
      color: "text-yellow-600 bg-yellow-50",
    },
    {
      label: "Vehicles Pending",
      value: workflows
        .filter((w) => w.status === "IN_PROGRESS")
        .reduce((sum, w) => sum + w.vehicleCount, 0)
        .toString(),
      icon: Car,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Customer Onboarding
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage the client onboarding pipeline from inquiry to go-live
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          New Onboarding
        </button>
      </div>

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
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
        <h2 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Pipeline Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {stages.map((stage) => {
            const count = workflows.filter(
              (w) => w.currentStage === stage.key && w.status !== "COMPLETED" && w.status !== "CANCELLED"
            ).length;
            const StageIcon = stage.icon;
            return (
              <div
                key={stage.key}
                className="flex flex-col items-center rounded-lg border border-gray-100 bg-gray-50 p-3 text-center"
              >
                <StageIcon className="mb-1.5 h-5 w-5 text-gray-500" />
                <p className="text-xs font-medium text-gray-700">
                  {stage.label}
                </p>
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
                statusFilter === filter
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
          <p className="text-lg font-medium text-gray-500">
            No onboardings found
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Try adjusting your filters or search query
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWorkflows.map((workflow) => {
            const progress = getStageProgress(workflow);
            const currentStageData = stages.find((s) => s.key === workflow.currentStage);
            const CurrentIcon = currentStageData?.icon || CircleDot;

            return (
              <div
                key={workflow.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Card Top */}
                <div className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Customer Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {workflow.customerName}
                        </h3>
                        <span className="text-xs font-mono text-gray-400">
                          {workflow.id}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {workflow.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <Car className="h-3.5 w-3.5" />
                          {workflow.vehicleCount} vehicles
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {workflow.assignedTo}
                        </span>
                      </div>
                    </div>

                    {/* Right: Status & Stage */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-sm">
                        <CurrentIcon className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-gray-700">
                          {currentStageData?.label}
                        </span>
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
                        Progress: {workflow.stagesCompleted.length}/{stages.length} stages
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
                              : "bg-blue-500"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stage Dots */}
                  <div className="mt-3 flex items-center gap-1">
                    {stages.map((stage, idx) => {
                      const isCompleted = workflow.stagesCompleted.includes(stage.key);
                      const isCurrent = workflow.currentStage === stage.key && workflow.status !== "COMPLETED";
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
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          {idx < stages.length - 1 && (
                            <div
                              className={cn(
                                "h-0.5 w-4 sm:w-6",
                                isCompleted ? "bg-green-300" : "bg-gray-200"
                              )}
                            />
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
                      Started {formatDate(workflow.startDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Rocket className="h-3.5 w-3.5" />
                      Target {formatDate(workflow.targetGoLive)}
                    </span>
                    {workflow.completedDate && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completed {formatDate(workflow.completedDate)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedWorkflow(workflow)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    View Details
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      {selectedWorkflow && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="w-full max-w-lg overflow-y-auto bg-white shadow-xl">
            {/* Drawer Header */}
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedWorkflow.customerName}
                </h2>
                <p className="text-sm text-gray-500">{selectedWorkflow.id}</p>
              </div>
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              {/* Status */}
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
                    getOnboardingStatusColor(selectedWorkflow.status)
                  )}
                >
                  {formatStatusLabel(selectedWorkflow.status)}
                </span>
                <span className="text-sm text-gray-500">
                  {getStageProgress(selectedWorkflow)}% complete
                </span>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Contact
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    {selectedWorkflow.company}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {selectedWorkflow.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {selectedWorkflow.phone}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Vehicles</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedWorkflow.vehicleCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Assigned To</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedWorkflow.assignedTo}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(selectedWorkflow.startDate)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Target Go-Live</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(selectedWorkflow.targetGoLive)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Workflow Stages Timeline */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Workflow Stages
                </h3>
                <div className="space-y-0">
                  {stages.map((stage, idx) => {
                    const isCompleted = selectedWorkflow.stagesCompleted.includes(stage.key);
                    const isCurrent =
                      selectedWorkflow.currentStage === stage.key &&
                      selectedWorkflow.status !== "COMPLETED";
                    const StageIcon = stage.icon;

                    return (
                      <div key={stage.key} className="flex gap-3">
                        {/* Timeline Line */}
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full",
                              isCompleted
                                ? "bg-green-100 text-green-600"
                                : isCurrent
                                  ? "bg-blue-100 text-blue-600 ring-2 ring-blue-300"
                                  : "bg-gray-100 text-gray-400"
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <StageIcon className="h-4 w-4" />
                            )}
                          </div>
                          {idx < stages.length - 1 && (
                            <div
                              className={cn(
                                "w-0.5 flex-1 min-h-[24px]",
                                isCompleted ? "bg-green-200" : "bg-gray-200"
                              )}
                            />
                          )}
                        </div>
                        {/* Stage Info */}
                        <div className="pb-4">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isCompleted
                                ? "text-green-700"
                                : isCurrent
                                  ? "text-blue-700"
                                  : "text-gray-400"
                            )}
                          >
                            {stage.label}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-blue-500">Current stage</p>
                          )}
                          {isCompleted && (
                            <p className="text-xs text-green-500">Completed</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              {selectedWorkflow.notes && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Notes
                  </h3>
                  <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                    {selectedWorkflow.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Onboarding Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                New Customer Onboarding
              </h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    required
                    value={formData.customerName}
                    onChange={handleFormChange}
                    placeholder="Full name or contact person"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Company <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="company"
                    required
                    value={formData.company}
                    onChange={handleFormChange}
                    placeholder="Company or group name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleFormChange}
                      placeholder="email@company.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      placeholder="+264 61 000 0000"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Fleet Size (vehicles) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="vehicleCount"
                      required
                      min="1"
                      value={formData.vehicleCount}
                      onChange={handleFormChange}
                      placeholder="Number of vehicles"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Assigned To <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="assignedTo"
                      required
                      value={formData.assignedTo}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select team member</option>
                      <option value="Johannes H.">Johannes H.</option>
                      <option value="Maria S.">Maria S.</option>
                      <option value="Peter K.">Peter K.</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Target Go-Live Date
                  </label>
                  <input
                    type="date"
                    name="targetGoLive"
                    value={formData.targetGoLive}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleFormChange}
                    placeholder="Requirements, special considerations..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Start Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
