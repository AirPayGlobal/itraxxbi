// Create/edit flows against the LIVE app, as the temporary e2e admin and then as a client.
// Writes records named "E2E …" (and the client e2e.client@example.com); run e2e/cleanup.sql afterwards.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

const BASE = process.env.E2E_BASE_URL || "https://itraxxbi.sinapsedi.com";
const OUT = path.join(__dirname, "output") + "/";
fs.mkdirSync(OUT, { recursive: true });
const RUN = Date.now().toString().slice(-6);
const CO = `E2E Test Co ${RUN}`;
const CLIENT_EMAIL = "e2e.client@example.com";

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

function clerk(pathname, method = "GET", body) {
  const args = ["-sS", "--max-time", "30", "-X", method, "-H", "Content-Type: application/json",
    "-H", "Authorization: Bearer " + (process.env.CLERK_SECRET_KEY || "proxy-injected")];
  if (body) args.push("-d", JSON.stringify(body));
  return JSON.parse(execFileSync("curl", [...args, "https://api.clerk.com/v1" + pathname], { encoding: "utf8" }));
}

async function signIn(browser, email) {
  const users = clerk(`/users?email_address=${encodeURIComponent(email)}`);
  if (!users[0]) throw new Error(`No Clerk user ${email}`);
  const { token } = clerk("/sign_in_tokens", "POST", { user_id: users[0].id, expires_in_seconds: 300 });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in?__clerk_ticket=${token}`);
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 45000 });
  return { ctx, page };
}

async function step(page, name, fn) {
  try {
    const detail = await fn();
    check(name, true, detail || "");
  } catch (e) {
    check(name, false, String(e.message || e).split("\n")[0].slice(0, 160));
    await page.screenshot({ path: `${OUT}flow-fail-${name.replace(/[^a-z0-9]+/gi, "-")}.png` }).catch(() => {});
  }
}

const visible = (page, text) => page.getByText(text, { exact: false }).first().waitFor({ timeout: 15000 });

(async () => {
  const browser = await chromium.launch();
  const { ctx, page } = await signIn(browser, "e2e.admin@example.com");

  await step(page, "admin creates a customer", async () => {
    await page.goto(BASE + "/customers", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /new customer/i }).first().click();
    await page.getByPlaceholder("Customer full name").fill(CO);
    await page.getByPlaceholder("Company or group name").fill(CO);
    await page.getByPlaceholder("email@company.com").fill(CLIENT_EMAIL);
    await page.getByRole("button", { name: /create customer/i }).click();
    await visible(page, CO);
  });

  await step(page, "admin invites the customer's contact to the client portal", async () => {
    // The innermost card containing both this customer's name and a View button.
    await page.locator("div", { hasText: CO }).filter({ has: page.getByRole("button", { name: /^view$/i }) }).last()
      .getByRole("button", { name: /^view$/i }).click();
    await page.getByRole("button", { name: /invite to portal/i }).click();
    await page.getByPlaceholder("Full name").fill("E2E Client");
    const email = page.getByPlaceholder("Email address");
    await email.fill(CLIENT_EMAIL);
    await page.getByRole("button", { name: /send invite/i }).click();
    await page.locator("li", { hasText: CLIENT_EMAIL }).getByText(/invited/i).waitFor({ timeout: 20000 });
    await page.screenshot({ path: OUT + "flow-portal-invite.png" });
  });

  await step(page, "admin creates a task", async () => {
    await page.goto(BASE + "/tasks", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /new task/i }).first().click();
    await page.getByPlaceholder(/install gps trackers/i).fill(`E2E task ${RUN}`);
    await page.getByRole("button", { name: /create task/i }).click();
    await visible(page, `E2E task ${RUN}`);
  });

  await step(page, "admin opens a support ticket", async () => {
    await page.goto(BASE + "/tickets", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /new ticket|create ticket/i }).first().click();
    await page.getByPlaceholder("Full name").fill("E2E Caller");
    await page.getByPlaceholder("Brief description of the issue").fill(`E2E ticket ${RUN}`);
    await page.locator("form textarea").first().fill("Tracker offline since this morning (E2E).");
    await page.locator("form").getByRole("button", { name: /create|submit/i }).last().click();
    await visible(page, `E2E ticket ${RUN}`);
  });

  await step(page, "admin adds a sales deal", async () => {
    await page.goto(BASE + "/sales-pipeline", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /add deal/i }).first().click();
    await page.getByPlaceholder("e.g. Fleet GPS Installation").fill(`E2E deal ${RUN}`);
    await page.getByPlaceholder("Company name").fill(CO);
    await page.locator("form").getByRole("button", { name: /add deal/i }).click();
    await visible(page, `E2E deal ${RUN}`);
  });

  await step(page, "TRAXX answers from live data", async () => {
    await page.goto(BASE + "/traxx", { waitUntil: "networkidle" });
    const box = page.locator("textarea, input[type='text']").last();
    await box.fill("How many open tasks do I have?");
    await box.press("Enter");
    await page.getByText(/task/i).nth(3).waitFor({ timeout: 15000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: OUT + "flow-traxx.png" });
  });
  await ctx.close();

  // ---- The invited client signs up (Clerk user created directly) and uses the portal ----
  const existing = clerk(`/users?email_address=${encodeURIComponent(CLIENT_EMAIL)}`);
  if (!existing[0]) clerk("/users", "POST", { email_address: [CLIENT_EMAIL], first_name: "E2E", last_name: "Client",
    skip_password_requirement: true, public_metadata: { e2e: true } });
  const client = await signIn(browser, CLIENT_EMAIL).catch((e) => ({ error: e }));
  if (client.error) {
    check("client signs in", false, client.error.message);
  } else {
    const cp = client.page;
    await step(cp, "client lands on the portal with their company", async () => {
      await cp.waitForURL((u) => u.pathname.startsWith("/portal"), { timeout: 20000 });
      await visible(cp, CO);
      await cp.screenshot({ path: OUT + "flow-client-portal.png" });
    });
    await step(cp, "client cannot open staff pages", async () => {
      for (const p of ["/customers", "/finance", "/settings/team"]) {
        await cp.goto(BASE + p);
        await cp.waitForLoadState("networkidle").catch(() => {});
        const landed = new URL(cp.url()).pathname;
        if (landed !== "/portal") throw new Error(`${p} landed on ${landed}`);
      }
    });
    await step(cp, "client opens a support ticket", async () => {
      await cp.goto(BASE + "/portal", { waitUntil: "networkidle" });
      await cp.getByRole("button", { name: /support/i }).first().click();
      await cp.getByRole("button", { name: /new ticket/i }).click();
      await cp.getByPlaceholder("Subject").fill(`E2E client ticket ${RUN}`);
      await cp.locator("textarea").first().fill("Vehicle not showing on the map (E2E).");
      await cp.getByRole("button", { name: /submit ticket/i }).click();
      await visible(cp, `E2E client ticket ${RUN}`);
      await cp.screenshot({ path: OUT + "flow-client-ticket.png" });
    });
    await step(cp, "client sees only their own company's tickets", async () => {
      const others = await cp.getByText(`E2E ticket ${RUN}`).count();
      if (others) throw new Error("staff ticket for another caller is visible");
    });
    await client.ctx.close();
  }

  await browser.close();
  const failed = results.filter((x) => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed  (run ${RUN})`);
  process.exitCode = failed ? 1 : 0;
})();
