"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCheck,
  Plus,
  Search,
  X,
  Trash2,
  Eye,
  Loader2,
  Car,
  Send,
  Check,
  XCircle,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import {
  useInspections,
  useCreateInspection,
  useApproveInspection,
  useRejectInspection,
  useDeleteInspection,
  type VehicleInspection,
  type VehicleInspectionInput,
} from "@/lib/hooks/use-inspections";
import { useCustomers } from "@/lib/hooks/use-customers";
import { useAuth } from "@/components/providers/session-provider";
import type { InspectionStatus } from "@/lib/supabase/database.types";
import {
  INSPECTION_TYPES,
  CONDITION_ITEMS,
  EXTRAS_ITEMS,
  ANTI_THEFT_ITEMS,
  ACCESSORIES_ITEMS,
  type ConditionChecks,
  type BoolMap,
} from "@/lib/inspection-fields";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function emptyForm(): VehicleInspectionInput {
  return {
    inspection_date: "",
    start_time: "",
    end_time: "",
    device_no: "",
    inspection_type: null,
    customer_id: null,
    client_name: "",
    insurer: "",
    vehicle_make: "",
    vehicle_model_year: "",
    vehicle_color: "",
    engine_number: "",
    vin_number: "",
    odo: "",
    reg_number: "",
    gps_imei: "",
    gps_serial: "",
    sim_number: "",
    fuel_sensor_make: "",
    fuel_sensor_length: "",
    seal_no_1: "",
    seal_no_2: "",
    mdvr_make: "",
    mdvr_serial: "",
    mdvr_id: "",
    remote_view: "",
    condition_checks: Object.fromEntries(
      CONDITION_ITEMS.map((i) => [i.key, { pre: false, post: false }])
    ) as ConditionChecks,
    radio_make: "",
    extras: Object.fromEntries(EXTRAS_ITEMS.map((i) => [i.key, false])) as BoolMap,
    anti_theft: Object.fromEntries(
      ANTI_THEFT_ITEMS.map((i) => [i.key, false])
    ) as BoolMap,
    accessories: Object.fromEntries(
      ACCESSORIES_ITEMS.map((i) => [i.key, false])
    ) as BoolMap,
    accessories_other: "",
    body_observations: "",
    comments: "",
    technician_name: "",
    employee_code: "",
    technician_signature: "",
    witness_name: "",
    signed_pre_check: false,
    signed_post_check: false,
  };
}

// --- Small building blocks ---------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-slate-200 pt-5">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </label>
      <input
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function typeLabel(t: string | null): string {
  return INSPECTION_TYPES.find((x) => x.value === t)?.label ?? "—";
}

const STATUS_STYLES: Record<InspectionStatus, string> = {
  SUBMITTED: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

function StatusBadge({ status }: { status: InspectionStatus }) {
  const label =
    status === "APPROVED"
      ? "Approved · Sent"
      : status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      {label}
    </span>
  );
}

// --- Page --------------------------------------------------------------------

export default function InspectionsPage() {
  const { data: inspections = [], isLoading, isError, error } = useInspections();
  const { data: customers = [] } = useCustomers();
  const { profile } = useAuth();
  const createInspection = useCreateInspection();
  const approveInspection = useApproveInspection();
  const rejectInspection = useRejectInspection();
  const deleteInspection = useDeleteInspection();

  // Who may approve & send to the client: Office Administrators, managers, admins.
  const canReview =
    profile?.role === "ADMIN" ||
    profile?.role === "MANAGER" ||
    (profile?.job_title ?? "").toLowerCase().includes("office admin");

  async function handleApprove(i: VehicleInspection) {
    let clientEmail: string | undefined;
    if (!i.customer_id && !i.client_email) {
      const entered = window.prompt(
        "Client email to send this inspection to:"
      );
      if (!entered) return;
      clientEmail = entered;
    }
    await approveInspection
      .mutateAsync({ inspection: i, clientEmail })
      .catch(() => {});
  }

  async function handleReject(i: VehicleInspection) {
    const note = window.prompt("Reason for returning to the technician (optional):");
    if (note === null) return;
    await rejectInspection
      .mutateAsync({ inspection: i, note: note || undefined })
      .catch(() => {});
  }

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<VehicleInspection | null>(null);
  const [form, setForm] = useState<VehicleInspectionInput>(emptyForm());

  const set = <K extends keyof VehicleInspectionInput>(
    key: K,
    value: VehicleInspectionInput[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const setCondition = (key: string, side: "pre" | "post", value: boolean) =>
    setForm((prev) => ({
      ...prev,
      condition_checks: {
        ...(prev.condition_checks as ConditionChecks),
        [key]: {
          ...(prev.condition_checks as ConditionChecks)[key],
          [side]: value,
        },
      },
    }));

  const toggleGroup = (
    group: "extras" | "anti_theft" | "accessories",
    key: string,
    value: boolean
  ) =>
    setForm((prev) => ({
      ...prev,
      [group]: { ...(prev[group] as BoolMap), [key]: value },
    }));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return inspections.filter(
      (i) =>
        q === "" ||
        (i.reg_number ?? "").toLowerCase().includes(q) ||
        (i.client_name ?? "").toLowerCase().includes(q) ||
        (i.technician_name ?? "").toLowerCase().includes(q) ||
        (i.vehicle_make ?? "").toLowerCase().includes(q)
    );
  }, [inspections, search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createInspection.mutateAsync(form);
      setShowForm(false);
      setForm(emptyForm());
    } catch {
      /* handled in hook */
    }
  }

  async function handleDelete(i: VehicleInspection) {
    if (
      !window.confirm(
        `Delete inspection for ${i.reg_number || i.client_name || "this vehicle"}?`
      )
    )
      return;
    await deleteInspection.mutateAsync(i.id).catch(() => {});
  }

  const cond = form.condition_checks as ConditionChecks;
  const extras = form.extras as BoolMap;
  const antiTheft = form.anti_theft as BoolMap;
  const accessories = form.accessories as BoolMap;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Vehicle Inspections
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Technician fitment / de-installation inspection checklists
            </p>
          </div>
          <button
            onClick={() => {
              setForm(emptyForm());
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Inspection
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by reg, client, technician, make..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Reg Number</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Technician</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-500" />
                      <p className="text-sm">Loading inspections…</p>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-red-500">
                      <p className="text-sm font-medium">
                        Failed to load inspections
                      </p>
                      <p className="mt-1 text-xs">
                        {(error as Error)?.message ?? "Please try again."}
                      </p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                      <p className="text-sm font-medium">No inspections yet</p>
                      <p className="mt-1 text-xs">
                        Complete a checklist with &quot;New Inspection&quot;.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((i) => (
                    <tr key={i.id} className="hover:bg-gray-50/70">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {i.inspection_date
                          ? formatDate(i.inspection_date)
                          : formatDate(i.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                        {i.reg_number || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {i.client_name || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {[i.vehicle_make, i.vehicle_model_year]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {typeLabel(i.inspection_type)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {i.technician_name || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {canReview && i.status === "SUBMITTED" && (
                            <>
                              <button
                                title="Approve & send to client"
                                disabled={approveInspection.isPending}
                                onClick={() => handleApprove(i)}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                title="Return to technician"
                                disabled={rejectInspection.isPending}
                                onClick={() => handleReject(i)}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            title="View"
                            onClick={() => setViewing(i)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => handleDelete(i)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-6 w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  Vehicle Inspection / Checklist
                </h2>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
              {/* Header */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Date
                  </label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.inspection_date ?? ""}
                    onChange={(e) => set("inspection_date", e.target.value)}
                  />
                </div>
                <TextField
                  label="Start Time"
                  value={form.start_time ?? ""}
                  onChange={(v) => set("start_time", v)}
                  placeholder="08:00"
                />
                <TextField
                  label="End Time"
                  value={form.end_time ?? ""}
                  onChange={(v) => set("end_time", v)}
                  placeholder="09:30"
                />
                <TextField
                  label="Device No"
                  value={form.device_no ?? ""}
                  onChange={(v) => set("device_no", v)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Job Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {INSPECTION_TYPES.map((t) => (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => set("inspection_type", t.value)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                        form.inspection_type === t.value
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client / Vehicle */}
              <Section title="Client & Vehicle">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Client
                    </label>
                    <select
                      className={inputCls}
                      value={form.customer_id ?? ""}
                      onChange={(e) => {
                        const id = e.target.value || null;
                        set("customer_id", id);
                        const c = customers.find((x) => x.id === id);
                        if (c) set("client_name", c.name);
                      }}
                    >
                      <option value="">— Select or type below —</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className={cn(inputCls, "mt-2")}
                      value={form.client_name ?? ""}
                      onChange={(e) => set("client_name", e.target.value)}
                      placeholder="Client name"
                    />
                  </div>
                  <TextField
                    label="Insurer"
                    value={form.insurer ?? ""}
                    onChange={(v) => set("insurer", v)}
                  />
                  <TextField
                    label="Vehicle Make"
                    value={form.vehicle_make ?? ""}
                    onChange={(v) => set("vehicle_make", v)}
                  />
                  <TextField
                    label="Vehicle Model & Year"
                    value={form.vehicle_model_year ?? ""}
                    onChange={(v) => set("vehicle_model_year", v)}
                  />
                  <TextField
                    label="Vehicle Color"
                    value={form.vehicle_color ?? ""}
                    onChange={(v) => set("vehicle_color", v)}
                  />
                  <TextField
                    label="Engine Number"
                    value={form.engine_number ?? ""}
                    onChange={(v) => set("engine_number", v)}
                  />
                  <TextField
                    label="VIN Number"
                    value={form.vin_number ?? ""}
                    onChange={(v) => set("vin_number", v)}
                  />
                  <TextField
                    label="ODO"
                    value={form.odo ?? ""}
                    onChange={(v) => set("odo", v)}
                  />
                  <TextField
                    label="Reg Number"
                    value={form.reg_number ?? ""}
                    onChange={(v) => set("reg_number", v)}
                  />
                </div>
              </Section>

              {/* Device / installation */}
              <Section title="Device & Installation">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <TextField label="GPS IMEI Number" value={form.gps_imei ?? ""} onChange={(v) => set("gps_imei", v)} />
                  <TextField label="GPS SRL No." value={form.gps_serial ?? ""} onChange={(v) => set("gps_serial", v)} />
                  <TextField label="SIM Number" value={form.sim_number ?? ""} onChange={(v) => set("sim_number", v)} />
                  <TextField label="Fuel Sensor Make" value={form.fuel_sensor_make ?? ""} onChange={(v) => set("fuel_sensor_make", v)} />
                  <TextField label="Fuel Sensor Length" value={form.fuel_sensor_length ?? ""} onChange={(v) => set("fuel_sensor_length", v)} />
                  <TextField label="Seal No. 1" value={form.seal_no_1 ?? ""} onChange={(v) => set("seal_no_1", v)} />
                  <TextField label="Seal No. 2" value={form.seal_no_2 ?? ""} onChange={(v) => set("seal_no_2", v)} />
                  <TextField label="MDVR Make" value={form.mdvr_make ?? ""} onChange={(v) => set("mdvr_make", v)} />
                  <TextField label="MDVR Serial No." value={form.mdvr_serial ?? ""} onChange={(v) => set("mdvr_serial", v)} />
                  <TextField label="MDVR ID" value={form.mdvr_id ?? ""} onChange={(v) => set("mdvr_id", v)} />
                  <TextField label="Remote View" value={form.remote_view ?? ""} onChange={(v) => set("remote_view", v)} />
                </div>
              </Section>

              {/* Vehicle Condition */}
              <Section title="Vehicle Condition (Pre / Post)">
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs uppercase text-slate-500">
                        <th className="px-3 py-2 text-left font-semibold">Item</th>
                        <th className="w-16 px-3 py-2 text-center font-semibold">Pre</th>
                        <th className="w-16 px-3 py-2 text-center font-semibold">Post</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {CONDITION_ITEMS.map((item) => (
                        <tr key={item.key}>
                          <td className="px-3 py-1.5 text-slate-700">{item.label}</td>
                          <td className="px-3 py-1.5 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              checked={cond[item.key]?.pre ?? false}
                              onChange={(e) => setCondition(item.key, "pre", e.target.checked)}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              checked={cond[item.key]?.post ?? false}
                              onChange={(e) => setCondition(item.key, "post", e.target.checked)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* Extras */}
              <Section title="Extras">
                <TextField
                  label="Radio Make"
                  value={form.radio_make ?? ""}
                  onChange={(v) => set("radio_make", v)}
                />
                <div className="mt-3 flex flex-wrap gap-4">
                  {EXTRAS_ITEMS.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={extras[item.key] ?? false}
                        onChange={(e) => toggleGroup("extras", item.key, e.target.checked)}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </Section>

              {/* Anti-Theft */}
              <Section title="Anti-Theft">
                <div className="flex flex-wrap gap-4">
                  {ANTI_THEFT_ITEMS.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={antiTheft[item.key] ?? false}
                        onChange={(e) => toggleGroup("anti_theft", item.key, e.target.checked)}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </Section>

              {/* Accessories */}
              <Section title="Accessories">
                <div className="flex flex-wrap gap-4">
                  {ACCESSORIES_ITEMS.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={accessories[item.key] ?? false}
                        onChange={(e) => toggleGroup("accessories", item.key, e.target.checked)}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <TextField
                    label="Other"
                    value={form.accessories_other ?? ""}
                    onChange={(v) => set("accessories_other", v)}
                  />
                </div>
              </Section>

              {/* Observations */}
              <Section title="Observations">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      External Body Condition Observations
                    </label>
                    <textarea
                      rows={3}
                      className={inputCls}
                      value={form.body_observations ?? ""}
                      onChange={(e) => set("body_observations", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Comments
                    </label>
                    <textarea
                      rows={2}
                      className={inputCls}
                      value={form.comments ?? ""}
                      onChange={(e) => set("comments", e.target.value)}
                    />
                  </div>
                </div>
              </Section>

              {/* Sign-off */}
              <Section title="Sign-off">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField label="Technician Name" value={form.technician_name ?? ""} onChange={(v) => set("technician_name", v)} />
                  <TextField label="Employee Code" value={form.employee_code ?? ""} onChange={(v) => set("employee_code", v)} />
                  <TextField label="Technician Signature" value={form.technician_signature ?? ""} onChange={(v) => set("technician_signature", v)} placeholder="Type full name to sign" />
                  <TextField label="Witness Name" value={form.witness_name ?? ""} onChange={(v) => set("witness_name", v)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={form.signed_pre_check ?? false}
                      onChange={(e) => set("signed_pre_check", e.target.checked)}
                    />
                    Signed — Pre Check
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={form.signed_post_check ?? false}
                      onChange={(e) => set("signed_post_check", e.target.checked)}
                    />
                    Signed — Post Check
                  </label>
                </div>
              </Section>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInspection.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createInspection.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit to Office Administrator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewing && (
        <InspectionDetail
          inspection={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

// --- Read-only detail --------------------------------------------------------

function InspectionDetail({
  inspection: i,
  onClose,
}: {
  inspection: VehicleInspection;
  onClose: () => void;
}) {
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">
        {value || "—"}
      </span>
    </div>
  );

  const checkedList = (map: Record<string, boolean>, items: { key: string; label: string }[]) =>
    items
      .filter((it) => map?.[it.key])
      .map((it) => it.label)
      .join(", ") || "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="my-6 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              Inspection — {i.reg_number || i.client_name || "Vehicle"}
            </h2>
            <StatusBadge status={i.status} />
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[75vh] space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              Header
            </h3>
            {row("Date", i.inspection_date ? formatDate(i.inspection_date) : "—")}
            {row("Start / End", `${i.start_time || "—"} – ${i.end_time || "—"}`)}
            {row("Device No", i.device_no)}
            {row("Type", typeLabel(i.inspection_type))}
          </div>
          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              Client & Vehicle
            </h3>
            {row("Client", i.client_name)}
            {row("Insurer", i.insurer)}
            {row("Make / Model", `${i.vehicle_make || "—"} ${i.vehicle_model_year || ""}`)}
            {row("Color", i.vehicle_color)}
            {row("Reg / VIN", `${i.reg_number || "—"} / ${i.vin_number || "—"}`)}
            {row("Engine / ODO", `${i.engine_number || "—"} / ${i.odo || "—"}`)}
          </div>
          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              Device
            </h3>
            {row("GPS IMEI", i.gps_imei)}
            {row("GPS SRL", i.gps_serial)}
            {row("SIM", i.sim_number)}
            {row("Seals", `${i.seal_no_1 || "—"} / ${i.seal_no_2 || "—"}`)}
          </div>
          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              Condition (Pre → Post)
            </h3>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {CONDITION_ITEMS.map((it) => {
                const c = i.condition_checks?.[it.key];
                return (
                  <div key={it.key} className="flex justify-between text-sm">
                    <span className="text-slate-600">{it.label}</span>
                    <span className="font-medium text-slate-700">
                      {c?.pre ? "✓" : "✗"} → {c?.post ? "✓" : "✗"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              Extras / Anti-Theft / Accessories
            </h3>
            {row("Radio Make", i.radio_make)}
            {row("Extras", checkedList(i.extras, EXTRAS_ITEMS))}
            {row("Anti-Theft", checkedList(i.anti_theft, ANTI_THEFT_ITEMS))}
            {row("Accessories", checkedList(i.accessories, ACCESSORIES_ITEMS))}
            {row("Other", i.accessories_other)}
          </div>
          {(i.body_observations || i.comments) && (
            <div className="border-t border-slate-100 pt-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                Observations
              </h3>
              {i.body_observations && (
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {i.body_observations}
                </p>
              )}
              {i.comments && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">
                  {i.comments}
                </p>
              )}
            </div>
          )}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              Sign-off
            </h3>
            {row("Technician", i.technician_name)}
            {row("Employee Code", i.employee_code)}
            {row("Witness", i.witness_name)}
            {row(
              "Signed",
              `Pre ${i.signed_pre_check ? "✓" : "✗"} · Post ${
                i.signed_post_check ? "✓" : "✗"
              }`
            )}
          </div>
          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              Approval & Dispatch
            </h3>
            {row("Status", <StatusBadge status={i.status} />)}
            {i.status === "APPROVED" && (
              <>
                {row(
                  "Sent to client",
                  i.client_email || "—"
                )}
                {row(
                  "Sent at",
                  i.sent_to_client_at
                    ? formatDate(i.sent_to_client_at)
                    : "—"
                )}
              </>
            )}
            {i.status === "REJECTED" &&
              row("Reason", i.review_note || "—")}
          </div>
        </div>
      </div>
    </div>
  );
}
