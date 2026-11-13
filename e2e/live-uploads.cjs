// Live checks for data uploads, as the temporary e2e admin: deal import + attachment, debtors age
// analysis upload, payments import, payslip import + PDF. Writes records named "E2E …"; run
// e2e/live-cleanup.cjs afterwards.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

const BASE = process.env.E2E_BASE_URL || "https://itraxxbi.sinapsedi.com";
const OUT = path.join(__dirname, "output") + "/";
const FILES = path.join(OUT, "upload-fixtures");
fs.mkdirSync(FILES, { recursive: true });
const RUN = Date.now().toString().slice(-6);

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};
function clerk(pathname, method = "GET", body) {
  const args = ["-sS", "--max-time", "30", "-X", method, "-H", "Content-Type: application/json",
    "-H", "Authorization: Bearer " + (process.env.CLERK_SECRET_KEY || "proxy-injected")];
  if (body) args.push("-d", JSON.stringify(body));
  const out = execFileSync("curl", [...args, "https://api.clerk.com/v1" + pathname], { encoding: "utf8" });
  return out ? JSON.parse(out) : null;
}
function ensureUser(email) {
  const found = clerk(`/users?email_address=${encodeURIComponent(email)}`);
  if (found[0]) return found[0];
  return clerk("/users", "POST", { email_address: [email], first_name: "E2E", last_name: email.split("@")[0].split(".")[1],
    skip_password_requirement: true, public_metadata: { e2e: true } });
}
async function signIn(browser, email) {
  const user = ensureUser(email);
  const { token } = clerk("/sign_in_tokens", "POST", { user_id: user.id, expires_in_seconds: 300 });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in?__clerk_ticket=${token}`);
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 45000 });
  if (page.url().includes("/no-access")) throw new Error(`${email} has no access (no invitation or profile)`);
  return { ctx, page };
}
async function step(page, name, fn) {
  try {
    check(name, true, (await fn()) || "");
  } catch (e) {
    check(name, false, String(e.message || e).split("\n")[0].slice(0, 180));
    await page.screenshot({ path: `${OUT}upload-fail-${name.replace(/[^a-z0-9]+/gi, "-")}.png` }).catch(() => {});
  }
}

// ---- Fixtures: shaped like real exports (title rows, N$ amounts, totals rows, day-first dates) ----
const fx = (name, text) => {
  const p = path.join(FILES, name);
  fs.writeFileSync(p, text);
  return p;
};
const dealsCsv = fx("deals.csv", [
  "Deal,Company,Contact,Email,Value,Stage,Expected Close",
  `E2E import deal A ${RUN},E2E Import Co ${RUN},Jane Doe,jane@example.com,"N$ 12,500.00",Proposal sent,30/11/2026`,
  `E2E import deal B ${RUN},E2E Import Co ${RUN},John Doe,john@example.com,8000,Won,15/12/2026`,
  `,Missing title Co,,,100,lead,`,
].join("\n"));
const debtorsCsv = fx("debtors.csv", [
  "ITRACKERX Debtors Age Analysis,,,,,,,",
  "Account,Customer Name,Current,30 Days,60 Days,90 Days,120+ Days,Total",
  `E2E-A${RUN},E2E Debtor A ${RUN},"1,000.00",500.00,0,0,250.00,"1,750.00"`,
  `E2E-B${RUN},E2E Debtor B ${RUN},0,0,0,"3,000.00",0,`,
  `,Grand Total,"1,000.00",500.00,0,"3,000.00",250.00,"4,750.00"`,
].join("\n"));
const paymentsCsv = fx("payments.csv", [
  "Date,Description,Amount",
  `13/11/2026,E2E PAYMENT ${RUN} EFT,"1,500.00"`,
  `13/11/2026,E2E BANK CHARGES ${RUN},-25.00`,
].join("\n"));
const pdf = fx(`E2E-proof-${RUN}.pdf`, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

async function importVia(page, opener, file, expectReady) {
  await opener.click();
  const dialog = page.locator("div.fixed.inset-0").last();
  await dialog.locator('input[type="file"]').setInputFiles(file);
  await dialog.getByText(/rows$/).first().waitFor({ timeout: 15000 });
  await dialog.getByRole("button", { name: /check rows/i }).click();
  const ready = dialog.getByText(/ready to import/);
  await ready.waitFor({ timeout: 20000 });
  const text = (await dialog.innerText()).replace(/\s+/g, " ");
  const n = Number((text.match(/(\d+) ready to import/) || [])[1]);
  if (n !== expectReady) throw new Error(`expected ${expectReady} ready, got ${n}: ${text.slice(0, 200)}`);
  const skipped = (text.match(/(\d+) will be skipped/) || [])[1] || "0";
  await dialog.getByRole("button", { name: /^import \d+ rows?$/i }).click();
  await dialog.waitFor({ state: "detached", timeout: 30000 });
  return `${n} imported, ${skipped} skipped`;
}

(async () => {
  const browser = await chromium.launch();
  const { ctx, page } = await signIn(browser, "e2e.admin@example.com");

  await step(page, "import deals from CSV", async () => {
    await page.goto(BASE + "/sales-pipeline", { waitUntil: "networkidle" });
    const r = await importVia(page, page.getByRole("button", { name: /import deals/i }).first(), dealsCsv, 2);
    await page.getByText(`E2E import deal A ${RUN}`).first().waitFor({ timeout: 15000 });
    return r;
  });

  await step(page, "attach a document to a deal and open it", async () => {
    await page.getByText(`E2E import deal A ${RUN}`).first().click();
    const docs = page.getByText("Documents", { exact: true }).first();
    await docs.waitFor({ timeout: 10000 });
    await page.locator('input[type="file"][multiple]').last().setInputFiles(pdf);
    await page.getByText(path.basename(pdf)).first().waitFor({ timeout: 20000 });
    // The file is served as a download from a short-lived signed URL in the private bucket.
    const [popup] = await Promise.all([
      page.context().waitForEvent("page", { timeout: 15000 }),
      page.getByRole("button", { name: path.basename(pdf) }).first().click(),
    ]);
    const dl = await popup.waitForEvent("download", { timeout: 20000 });
    const ok = dl.url().includes("/storage/v1/object/sign/records/") && dl.suggestedFilename() === path.basename(pdf);
    await popup.close().catch(() => {});
    if (!ok) throw new Error(`download ${dl.url().slice(0, 80)} as ${dl.suggestedFilename()}`);
    return "signed private URL";
  });

  await step(page, "upload a debtors age analysis", async () => {
    await page.goto(BASE + "/finance", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^debtors$/i }).click();
    const r = await importVia(page, page.getByRole("button", { name: /upload age analysis/i }).first(), debtorsCsv, 2);
    await page.getByText(`E2E Debtor B ${RUN}`).first().waitFor({ timeout: 15000 });
    const body = await page.locator("main").innerText();
    if (!/4,750\.00/.test(body)) throw new Error("total outstanding N$4,750.00 not shown");
    await page.screenshot({ path: OUT + "upload-debtors.png" });
    return r + ", total N$4,750.00";
  });

  await step(page, "import payments from a bank statement", async () => {
    await page.getByRole("button", { name: /^payments$/i }).click();
    const r = await importVia(page, page.getByRole("button", { name: /import payments/i }).first(), paymentsCsv, 1);
    await page.getByText(`E2E PAYMENT ${RUN} EFT`).first().waitFor({ timeout: 15000 });
    await page.screenshot({ path: OUT + "upload-payments.png" });
    return r;
  });

  await step(page, "import a payslip for a staff member", async () => {
    const payslipsCsv = fx("payslips.csv", [
      "Email,Period,Basic Salary,Gross Pay,PAYE,Total Deductions,Net Pay",
      `e2e.staff@example.com,Oct 2026,"10,000.00","10,000.00",900.00,"1,000.00","9,000.00"`,
      `nobody@example.com,Oct 2026,1000,1000,0,0,1000`,
    ].join("\n"));
    await page.goto(BASE + "/payslips", { waitUntil: "networkidle" });
    return importVia(page, page.getByRole("button", { name: /import payslips/i }).first(), payslipsCsv, 1);
  });

  await step(page, "fresh page load shows data (no empty cache before sign-in loads)", async () => {
    await page.goto(BASE + "/sales-pipeline", { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^list$/i }).click();
    await page.getByText(`E2E import deal A ${RUN}`).first().waitFor({ timeout: 20000 });
    await page.getByText(`E2E import deal A ${RUN}`).first().click();
    const owner = await page.getByText(/Owner:/).first().innerText();
    if (/unknown/i.test(owner)) throw new Error(owner);
    return owner.replace(/.*Owner:\s*/, "owner ");
  });

  await step(page, "admin adds an employee with a role and employment details", async () => {
    const email = `e2e.emp${RUN}@example.com`;
    await page.goto(BASE + "/settings/team", { waitUntil: "networkidle" });
    await page.locator("#emp-name").fill(`E2E Employee ${RUN}`);
    await page.locator("#emp-email").fill(email);
    await page.locator("#emp-role").selectOption("TECHNICIAN");
    await page.locator("#emp-title").fill("Installation Technician");
    await page.locator("#emp-salary").fill("15000");
    await page.getByLabel(/email them an invitation/i).uncheck();
    await page.getByRole("button", { name: /^add employee$/i }).click();
    const row = page.locator("li", { hasText: email });
    await row.getByText(/no login/i).waitFor({ timeout: 20000 });
    const role = await row.locator("select").inputValue();
    if (role !== "TECHNICIAN") throw new Error(`role ${role}`);
    await page.goto(BASE + "/hr", { waitUntil: "networkidle" });
    await page.getByText(`E2E Employee ${RUN}`).first().waitFor({ timeout: 20000 });
    return "listed as Technician, No login; in HR directory";
  });

  await ctx.close();
  await browser.close();
  const failed = results.filter((x) => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed  (run ${RUN})`);
  process.exitCode = failed ? 1 : 0;
})();
