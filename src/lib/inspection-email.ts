import type { VehicleInspectionRow } from "@/lib/supabase/database.types";
import {
  INSPECTION_TYPES,
  CONDITION_ITEMS,
  EXTRAS_ITEMS,
  ANTI_THEFT_ITEMS,
  ACCESSORIES_ITEMS,
} from "@/lib/inspection-fields";

function esc(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function typeLabel(t: string | null): string {
  return INSPECTION_TYPES.find((x) => x.value === t)?.label ?? "—";
}

function checkedList(
  map: Record<string, boolean> | null | undefined,
  items: { key: string; label: string }[]
): string {
  const on = items.filter((it) => map?.[it.key]).map((it) => it.label);
  return on.length ? esc(on.join(", ")) : "—";
}

function kvRows(pairs: [string, unknown][]): string {
  return pairs
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">${esc(
          k
        )}</td><td style="padding:4px 0;color:#0f172a;font-weight:600;">${esc(
          v
        )}</td></tr>`
    )
    .join("");
}

export function inspectionSubject(i: VehicleInspectionRow): string {
  const ref = i.reg_number || i.vin_number || "vehicle";
  return `Vehicle Inspection Report — ${ref}`;
}

export function inspectionEmailHtml(
  i: VehicleInspectionRow,
  opts: { companyName?: string } = {}
): string {
  const company = opts.companyName || "iTraxx BI";

  const conditionRows = CONDITION_ITEMS.map((it) => {
    const c = i.condition_checks?.[it.key];
    const mark = (b: boolean | undefined) =>
      b
        ? '<span style="color:#16a34a;">✓</span>'
        : '<span style="color:#cbd5e1;">—</span>';
    return `<tr>
      <td style="padding:3px 12px 3px 0;color:#334155;">${esc(it.label)}</td>
      <td style="padding:3px 12px;text-align:center;">${mark(c?.pre)}</td>
      <td style="padding:3px 0;text-align:center;">${mark(c?.post)}</td>
    </tr>`;
  }).join("");

  const section = (title: string, body: string) => `
    <h3 style="margin:22px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-top:1px solid #e2e8f0;padding-top:14px;">${esc(
      title
    )}</h3>${body}`;

  return `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
      <div style="border-bottom:2px solid #2563eb;padding-bottom:12px;margin-bottom:8px;">
        <h1 style="margin:0;font-size:20px;color:#0f172a;">${esc(company)}</h1>
        <p style="margin:4px 0 0;color:#64748b;font-size:14px;">Vehicle Inspection / Checklist</p>
      </div>

      ${section(
        "Summary",
        `<table style="font-size:14px;">${kvRows([
          ["Date", i.inspection_date],
          ["Job Type", typeLabel(i.inspection_type)],
          ["Client", i.client_name],
          ["Reg Number", i.reg_number],
          ["Vehicle", `${i.vehicle_make ?? ""} ${i.vehicle_model_year ?? ""}`.trim()],
          ["VIN", i.vin_number],
          ["ODO", i.odo],
          ["Device No", i.device_no],
        ])}</table>`
      )}

      ${section(
        "Device & Installation",
        `<table style="font-size:14px;">${kvRows([
          ["GPS IMEI", i.gps_imei],
          ["GPS SRL", i.gps_serial],
          ["SIM Number", i.sim_number],
          ["Seal No. 1", i.seal_no_1],
          ["Seal No. 2", i.seal_no_2],
        ])}</table>`
      )}

      ${section(
        "Vehicle Condition (Pre / Post)",
        `<table style="font-size:13px;width:100%;">
          <tr style="color:#94a3b8;font-size:11px;text-transform:uppercase;">
            <td style="padding-bottom:4px;">Item</td>
            <td style="padding-bottom:4px;text-align:center;">Pre</td>
            <td style="padding-bottom:4px;text-align:center;">Post</td>
          </tr>
          ${conditionRows}
        </table>`
      )}

      ${section(
        "Extras / Anti-Theft / Accessories",
        `<table style="font-size:14px;">${kvRows([
          ["Radio Make", i.radio_make],
          ["Extras", checkedList(i.extras, EXTRAS_ITEMS)],
          ["Anti-Theft", checkedList(i.anti_theft, ANTI_THEFT_ITEMS)],
          ["Accessories", checkedList(i.accessories, ACCESSORIES_ITEMS)],
          ["Other", i.accessories_other],
        ])}</table>`
      )}

      ${
        i.body_observations || i.comments
          ? section(
              "Observations",
              `<p style="font-size:14px;color:#334155;white-space:pre-wrap;margin:0;">${esc(
                i.body_observations
              )}</p>${
                i.comments
                  ? `<p style="font-size:13px;color:#64748b;white-space:pre-wrap;margin:8px 0 0;">${esc(
                      i.comments
                    )}</p>`
                  : ""
              }`
            )
          : ""
      }

      ${section(
        "Sign-off",
        `<table style="font-size:14px;">${kvRows([
          ["Technician", i.technician_name],
          ["Employee Code", i.employee_code],
          ["Witness", i.witness_name],
          [
            "Signed",
            `Pre ${i.signed_pre_check ? "✓" : "—"} · Post ${
              i.signed_post_check ? "✓" : "—"
            }`,
          ],
        ])}</table>`
      )}

      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">
        This inspection report was reviewed and approved by ${esc(company)}.
      </p>
    </div>
  </div>
</body></html>`;
}
