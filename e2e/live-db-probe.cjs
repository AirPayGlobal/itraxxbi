// Probes the LIVE Supabase API from outside, as an anonymous caller and with a forged token.
// Every write is expected to be refused; nothing is created.
const URL_ = "https://xhmkchduceqpubqplzcg.supabase.co";
const KEY = "sb_publishable_PXepzY5a9a8FtB_c8uNl1A_AHpdwELh"; // public by design
const crypto = require("crypto");
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const TABLES = ["profiles", "invitations", "customers", "vehicles", "job_cards", "vehicle_inspections", "tasks", "projects",
  "invoices", "invoice_items", "payments", "expenses", "tickets", "ticket_comments", "employees", "leave_requests",
  "documents", "assets", "notifications", "company_settings", "payslips", "deals", "customer_onboarding", "meetings",
  "performance_kpis", "trainings", "activity_logs"];

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const forged = (() => {
  const h = b64({ alg: "HS256", typ: "JWT" });
  const p = b64({ sub: "user_forged", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 600 });
  const s = crypto.createHmac("sha256", "not-the-real-secret").update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
})();

async function req(path, { method = "GET", token, body } = {}) {
  const headers = { apikey: KEY, "Content-Type": "application/json", Prefer: "return=representation" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(URL_ + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
}

(async () => {
  for (const t of TABLES) {
    const r = await req(`/rest/v1/${t}?select=*&limit=5`);
    const rows = Array.isArray(r.data) ? r.data.length : 0;
    check(`anonymous cannot read ${t}`, rows === 0, `HTTP ${r.status}, ${rows} rows`);
  }
  for (const [t, body] of [["customers", { name: "E2E probe" }], ["profiles", { email: "e2e@example.com", name: "x", role: "ADMIN" }],
                           ["invitations", { email: "e2e@example.com", name: "x", role: "ADMIN" }], ["deals", { title: "x", company: "x" }],
                           ["tickets", { ticket_number: "E2E", subject: "x", description: "x", customer_name: "x" }]]) {
    const r = await req(`/rest/v1/${t}`, { method: "POST", body });
    check(`anonymous cannot insert into ${t}`, r.status >= 400, `HTTP ${r.status}`);
  }
  const f = await req(`/rest/v1/profiles?select=*&limit=5`, { token: forged });
  check("forged token is rejected", f.status === 401 || (Array.isArray(f.data) && f.data.length === 0), `HTTP ${f.status}`);
  const f2 = await req(`/rest/v1/invitations`, { method: "POST", token: forged, body: { email: "e2e@example.com", name: "x", role: "ADMIN" } });
  check("forged token cannot create an admin invitation", f2.status >= 400, `HTTP ${f2.status}`);
  for (const fn of ["current_profile_id", "current_customer_id"]) {
    const r = await req(`/rest/v1/rpc/${fn}`, { method: "POST", body: {} });
    check(`anonymous ${fn}() returns nothing`, r.status >= 400 || r.data === null, `HTTP ${r.status} ${JSON.stringify(r.data)}`);
  }
  const mv = await req(`/rest/v1/rpc/mark_payslip_viewed`, { method: "POST", body: { payslip: "00000000-0000-0000-0000-000000000000" } });
  check("anonymous mark_payslip_viewed does nothing", mv.status >= 400 || mv.status === 204 || mv.data === null, `HTTP ${mv.status}`);
  for (const bucket of ["documents", "logos", "avatars"]) {
    const r = await req(`/storage/v1/object/list/${bucket}`, { method: "POST", body: { prefix: "", limit: 5 } });
    const n = Array.isArray(r.data) ? r.data.length : 0;
    check(`anonymous cannot list storage bucket ${bucket}`, n === 0, `HTTP ${r.status}, ${n} objects`);
  }
  const failed = results.filter((x) => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
})();
