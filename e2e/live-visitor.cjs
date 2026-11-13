// End-to-end checks against the LIVE site as a signed-out visitor. Read-only: creates nothing.
const { chromium, devices } = require("playwright");
const BASE = process.env.E2E_BASE_URL || "https://itraxxbi.sinapsedi.com";
const OUT = require("path").join(__dirname, "output") + "/";
require("fs").mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const PROTECTED = ["/", "/customer-onboarding", "/customers", "/documents", "/finance", "/hr", "/inspections",
  "/inventory", "/jobcards", "/meeting-ai", "/my-portal", "/payslips", "/portal", "/projects", "/sales-pipeline",
  "/settings", "/settings/team", "/staff", "/tasks", "/tickets", "/traxx", "/no-access"];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  const failedRequests = new Set();
  page.on("requestfailed", (r) => failedRequests.add(new URL(r.url()).host + " (" + r.failure()?.errorText + ")"));

  // 1. Sign-in page renders with branding and Clerk's form.
  const res = await page.goto(BASE + "/sign-in", { waitUntil: "networkidle" });
  check("sign-in page loads", res.status() === 200, `HTTP ${res.status()}`);
  const email = page.locator('input[name="identifier"]');
  await email.waitFor({ timeout: 20000 }).catch(() => {});
  check("Clerk sign-in form renders", await email.isVisible());
  const logos = await page.$$eval("img", (imgs) =>
    imgs.filter((i) => i.src.includes("/brand/")).map((i) => ({ src: i.src.split("/").pop(), ok: i.complete && i.naturalWidth > 0 }))
  );
  check("brand logo loads on sign-in", logos.some((l) => l.src === "itrackerx-logo-on-dark.png" && l.ok), JSON.stringify(logos));
  check("page title set", /iTraxx/i.test(await page.title()), await page.title());
  await page.screenshot({ path: OUT + "signin-desktop.png" });
  check("no Google / social sign-in button", (await page.getByText(/continue with google/i).count()) === 0);
  check("no Sign up link on sign-in (invite-only)", (await page.locator(".cl-footerAction").filter({ hasText: /sign up/i }).count()) === 0 &&
    !(await page.getByRole("link", { name: /^sign up$/i }).isVisible().catch(() => false)));

  // 2. Unknown account is refused with a clear message (no account is created).
  await email.fill("e2e-nobody-" + Date.now() + "@example.com");
  await page.getByRole("button", { name: /^continue$/i }).click();
  const err = page.locator(".cl-formFieldErrorText, [id$='-error-feedback'], .cl-alert");
  await err.first().waitFor({ timeout: 15000 }).catch(() => {});
  const errText = (await err.first().textContent().catch(() => "")) || "";
  check("unknown email is refused", errText.length > 0, errText.trim().slice(0, 80));
  await page.screenshot({ path: OUT + "signin-unknown.png" });

  // 3. Every app page sends signed-out visitors to the branded sign-in page (not Clerk's hosted portal).
  for (const path of PROTECTED) {
    const r = await page.request.get(BASE + path, { maxRedirects: 0 });
    const loc = r.headers()["location"] || "";
    check(`signed-out ${path} -> sign-in`, [302, 303, 307, 308].includes(r.status()) && loc.replace(BASE, "").startsWith("/sign-in"),
      `${r.status()} ${loc.replace(BASE, "")}`);
  }

  // 4. API routes refuse signed-out callers and leak no data.
  const apis = [
    ["GET", "/api/team"], ["POST", "/api/team/invite"],
    ["GET", "/api/customers/00000000-0000-0000-0000-000000000000/portal-users"],
    ["POST", "/api/customers/00000000-0000-0000-0000-000000000000/portal-users"],
    ["POST", "/api/invoices/send"], ["POST", "/api/inspections/send"],
  ];
  for (const [method, path] of apis) {
    const r = await page.request.fetch(BASE + path, { method, data: method === "POST" ? { email: "x@example.com" } : undefined, maxRedirects: 0 });
    const body = await r.text();
    check(`signed-out ${method} ${path} refused`, r.status() !== 200 && !/"ok":\s*true/.test(body), `HTTP ${r.status()}`);
  }

  // 5. Old URLs redirect; static brand assets and favicon serve.
  for (const [from, to] of [["/login", "/sign-in"], ["/register", "/sign-up"], ["/forgot-password", "/sign-in"], ["/reset-password", "/sign-in"]]) {
    const r = await page.request.get(BASE + from, { maxRedirects: 0 });
    check(`${from} redirects to ${to}`, (r.headers()["location"] || "").replace(BASE, "").startsWith(to), `${r.status()} ${r.headers()["location"]}`);
  }
  for (const a of ["/brand/itrackerx-logo.png", "/brand/itrackerx-logo-on-dark.png", "/brand/itrackerx-icon.png", "/icon.png"]) {
    const r = await page.request.get(BASE + a);
    check(`asset ${a}`, r.status() === 200 && (r.headers()["content-type"] || "").startsWith("image/"), `${r.status()} ${r.headers()["content-type"]}`);
  }
  const old = await page.request.get(BASE + "/logo.svg");
  check("old SVG logos removed", old.status() === 404, `HTTP ${old.status()}`);

  // 6. Sign-up page renders (invite-only).
  const su = await page.goto(BASE + "/sign-up", { waitUntil: "networkidle" });
  check("sign-up page loads", su.status() === 200, `HTTP ${su.status()}`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT + "signup.png" });

  // 7. Mobile layout of sign-in.
  const mctx = await browser.newContext({ ...devices["iPhone 13"] });
  const m = await mctx.newPage();
  await m.goto(BASE + "/sign-in", { waitUntil: "networkidle" });
  await m.locator('input[name="identifier"]').waitFor({ timeout: 20000 }).catch(() => {});
  const mobileLogo = await m.$$eval("img", (imgs) => imgs.some((i) => i.src.endsWith("itrackerx-logo.png") && i.naturalWidth > 0 && i.getBoundingClientRect().width > 0));
  check("mobile sign-in shows logo", mobileLogo);
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check("mobile sign-in has no horizontal scroll", !overflow);
  await m.screenshot({ path: OUT + "signin-mobile.png" });

  console.log("failed requests:", [...failedRequests].join(", ") || "none");
  // Hosts this sandbox can't reach are not app errors.
  const relevant = consoleErrors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED|favicon|status of 4\d\d/.test(e));
  check("no JavaScript errors on public pages", relevant.length === 0, relevant.slice(0, 3).join(" | "));

  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
})();
