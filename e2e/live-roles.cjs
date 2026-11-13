// Signed-in checks against the LIVE app, one temporary test user per role.
// Needs Clerk Backend API access (the proxy injects the production secret key for api.clerk.com)
// and test users e2e.<role>@example.com with matching invitations. Read-only: only opens pages.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE = process.env.E2E_BASE_URL || "https://itraxxbi.sinapsedi.com";
const OUT = path.join(__dirname, "output") + "/";
fs.mkdirSync(OUT, { recursive: true });

const ALL_PAGES = ["/", "/projects", "/tasks", "/jobcards", "/inspections", "/tickets", "/customers",
  "/customer-onboarding", "/staff", "/hr", "/payslips", "/documents", "/inventory", "/finance",
  "/sales-pipeline", "/my-portal", "/meeting-ai", "/traxx", "/settings", "/settings/team", "/portal"];
// Mirrors src/lib/role-access.ts.
const ACCESS = {
  admin: ["/", "/projects", "/tasks", "/jobcards", "/inspections", "/tickets", "/customers", "/customer-onboarding",
    "/staff", "/hr", "/payslips", "/documents", "/inventory", "/finance", "/sales-pipeline", "/my-portal",
    "/meeting-ai", "/traxx", "/settings", "/settings/team"],
  manager: ["/", "/projects", "/tasks", "/jobcards", "/inspections", "/tickets", "/customers", "/customer-onboarding",
    "/staff", "/hr", "/payslips", "/documents", "/inventory", "/finance", "/sales-pipeline", "/my-portal",
    "/meeting-ai", "/traxx"],
  tech: ["/", "/tasks", "/jobcards", "/inspections", "/tickets", "/customers", "/documents", "/inventory", "/my-portal"],
  staff: ["/", "/tasks", "/tickets", "/documents", "/hr", "/my-portal"],
  viewer: ["/", "/projects", "/tasks", "/jobcards", "/customers", "/finance"],
};
const roles = (process.env.E2E_ROLES || Object.keys(ACCESS).join(",")).split(",");

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

// Clerk Backend API via curl, which goes through the sandbox's network proxy (it injects the secret key).
const { execFileSync } = require("child_process");
async function clerk(pathname, init = {}) {
  const args = ["-sS", "--max-time", "30", "-X", init.method || "GET", "-H", "Content-Type: application/json",
    "-H", "Authorization: Bearer " + (process.env.CLERK_SECRET_KEY || "proxy-injected")];
  if (init.body) args.push("-d", init.body);
  return JSON.parse(execFileSync("curl", [...args, "https://api.clerk.com/v1" + pathname], { encoding: "utf8" }));
}

async function signIn(browser, email) {
  const users = await clerk(`/users?email_address=${encodeURIComponent(email)}`);
  if (!Array.isArray(users) || !users[0]) throw new Error(`No Clerk user ${email}`);
  const { token } = await clerk("/sign_in_tokens", {
    method: "POST",
    body: JSON.stringify({ user_id: users[0].id, expires_in_seconds: 300 }),
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in?__clerk_ticket=${token}`);
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 45000 });
  return { ctx, page };
}

const BAD_TEXT = /something went wrong|couldn.t load|could not load|failed to load|error loading|row-level security|permission denied|unexpected error|application error/i;

(async () => {
  const browser = await chromium.launch();
  for (const role of roles) {
    const email = `e2e.${role}@example.com`;
    let session;
    try {
      session = await signIn(browser, email);
    } catch (e) {
      check(`${role}: signs in`, false, e.message);
      continue;
    }
    const { ctx, page } = session;
    check(`${role}: signs in`, !page.url().includes("/no-access"), page.url().replace(BASE, ""));

    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !/ERR_TUNNEL_CONNECTION_FAILED|favicon/.test(m.text())) errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("response", (r) => {
      if (r.url().includes("supabase.co") && r.status() >= 400) errors.push(`Supabase ${r.status()} ${new URL(r.url()).pathname}`);
    });

    for (const p of ALL_PAGES) {
      errors.length = 0;
      await page.goto(BASE + p, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const landed = new URL(page.url()).pathname;
      if (ACCESS[role].includes(p)) {
        const text = await page.locator("main, body").first().innerText().catch(() => "");
        const bad = text.match(BAD_TEXT);
        const ok = landed === p && !bad && errors.length === 0;
        check(`${role}: ${p} works`, ok,
          landed !== p ? `redirected to ${landed}` : bad ? `page says "${bad[0]}"` : errors.slice(0, 2).join(" | "));
        if (role === "admin" || !ok) {
          await page.screenshot({ path: `${OUT}${role}${p === "/" ? "-home" : p.replace(/\//g, "-")}.png`, fullPage: false });
        }
      } else {
        const home = role === "client" ? "/portal" : "/";
        check(`${role}: ${p} blocked`, landed !== p, `landed on ${landed}`);
        void home;
      }
    }
    await ctx.close();
  }
  await browser.close();
  const failed = results.filter((x) => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
})();
