// Removes the live E2E test data as the temporary e2e admin (row-level security applies), then the
// e2e.*@example.com Clerk users. Same scope as e2e/cleanup.sql, for when the SQL Editor isn't handy.
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");

const BASE = process.env.E2E_BASE_URL || "https://itraxxbi.sinapsedi.com";
const SUPABASE = "https://xhmkchduceqpubqplzcg.supabase.co";
const KEY = "sb_publishable_PXepzY5a9a8FtB_c8uNl1A_AHpdwELh";

function clerk(pathname, method = "GET", body) {
  const args = ["-sS", "--max-time", "30", "-X", method, "-H", "Content-Type: application/json",
    "-H", "Authorization: Bearer " + (process.env.CLERK_SECRET_KEY || "proxy-injected")];
  if (body) args.push("-d", JSON.stringify(body));
  const out = execFileSync("curl", [...args, "https://api.clerk.com/v1" + pathname], { encoding: "utf8" });
  return out ? JSON.parse(out) : null;
}

(async () => {
  const admin = clerk(`/users?email_address=${encodeURIComponent("e2e.admin@example.com")}`)[0];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  if (admin) {
    const { token } = clerk("/sign_in_tokens", "POST", { user_id: admin.id, expires_in_seconds: 300 });
    await page.goto(`${BASE}/sign-in?__clerk_ticket=${token}`);
    await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 45000 });
    await page.waitForFunction(() => window.Clerk?.session, null, { timeout: 30000 });

    const steps = [
      ["customers", "name=like.E2E%20Test%20Co*", "select"],
      ["ticket_comments", null, "comments"],
      ["tickets", "subject=like.E2E%20*"],
      ["tasks", "title=like.E2E%20*"],
      ["deals", "company=like.E2E%20Test%20Co*"],
      ["deals", "title=like.E2E%20*"],
      ["meetings", "title=like.E2E%20*"],
      ["invitations", "email=like.e2e.*%40example.com"],
      ["profiles", "email=like.e2e.*%40example.com&role=eq.CLIENT"],
    ];
    const log = await page.evaluate(async ({ SUPABASE, KEY, steps }) => {
      const jwt = await window.Clerk.session.getToken();
      const h = { apikey: KEY, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json", Prefer: "return=representation" };
      const out = [];
      const custs = await (await fetch(`${SUPABASE}/rest/v1/customers?select=id&name=like.E2E%20Test%20Co*`, { headers: h })).json();
      const ids = (Array.isArray(custs) ? custs : []).map((c) => c.id);
      const inList = ids.length ? `(${ids.join(",")})` : "(00000000-0000-0000-0000-000000000000)";
      const tickets = await (await fetch(`${SUPABASE}/rest/v1/tickets?select=id&or=(subject.like.E2E*,customer_id.in.${inList})`, { headers: h })).json();
      const tIds = (Array.isArray(tickets) ? tickets : []).map((t) => t.id);
      const del = async (table, filter) => {
        const r = await fetch(`${SUPABASE}/rest/v1/${table}?${filter}`, { method: "DELETE", headers: h });
        const body = await r.json().catch(() => null);
        out.push(`${table}: HTTP ${r.status}, ${Array.isArray(body) ? body.length : JSON.stringify(body)} deleted`);
      };
      if (tIds.length) await del("ticket_comments", `ticket_id=in.(${tIds.join(",")})`);
      if (tIds.length) await del("tickets", `id=in.(${tIds.join(",")})`);
      for (const [table, filter] of steps) if (filter && !["customers", "ticket_comments", "tickets"].includes(table)) await del(table, filter);
      if (ids.length) {
        await del("customer_onboarding", `customer_id=in.${inList}`);
        await del("customers", `id=in.${inList}`);
      }
      return out;
    }, { SUPABASE, KEY, steps });
    log.forEach((l) => console.log(l));
  }
  await browser.close();

  if (process.env.KEEP_USERS) return;
  // Staff test profiles are removed after their Clerk users (admin RLS can't delete its own profile safely).
  const users = clerk("/users?limit=100&query=e2e.") || [];
  for (const u of users) {
    if (u.email_addresses.some((e) => /^e2e\..+@example\.com$/.test(e.email_address))) {
      clerk(`/users/${u.id}`, "DELETE");
      console.log(`Clerk user deleted: ${u.email_addresses[0].email_address}`);
    }
  }
})();
