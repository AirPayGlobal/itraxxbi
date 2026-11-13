// Applies new SQL files in supabase/migrations/ to the database before a production build.
//
// Runs as part of `npm run build`. On Vercel production builds a failure stops the deploy, so new
// code never goes live against a database that lacks its schema. Preview and local builds skip
// this unless MIGRATE=1 is set.
//
// Applied versions are recorded in supabase_migrations.schema_migrations (the Supabase CLI's own
// table), so `supabase db push` and this script agree on what has run.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

// Everything up to here was applied by hand (SQL Editor) before this script existed.
const BASELINE = "20261111000000";
const DIR = path.join(process.cwd(), "supabase", "migrations");

const isProduction = process.env.VERCEL_ENV === "production";
const forced = process.env.MIGRATE === "1";
if (!isProduction && !forced) {
  console.log("[migrate] Not a production build; skipping database migrations.");
  process.exit(0);
}

// Prefer an explicit DATABASE_URL, then the Vercel Supabase integration's pooled URL (IPv4), then direct.
const url = [process.env.DATABASE_URL, process.env.POSTGRES_URL, process.env.POSTGRES_URL_NON_POOLING]
  .map((v) => v?.trim())
  .find(Boolean);
if (!url) {
  console.error(
    "[migrate] No database connection string. Add DATABASE_URL in Vercel (Production) with the Supabase " +
      "Session pooler string: Supabase → Connect → Session pooler."
  );
  process.exit(1);
}

function connectionConfig(raw) {
  const u = new URL(raw);
  const local = ["localhost", "127.0.0.1", "::1"].includes(u.hostname) || u.searchParams.get("sslmode") === "disable";
  // Supabase's certificates aren't in Node's default store; the connection is still encrypted.
  u.searchParams.delete("sslmode");
  u.searchParams.delete("supa");
  u.searchParams.delete("pgbouncer");
  return { connectionString: u.toString(), ssl: local ? false : { rejectUnauthorized: false } };
}

const files = (await readdir(DIR)).filter((f) => /^\d{14}_.+\.sql$/.test(f)).sort();
const client = new pg.Client({ ...connectionConfig(url), connectionTimeoutMillis: 15000 });

try {
  await client.connect();
  console.log(`[migrate] Connected to ${new URL(url).hostname}.`);

  await client.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key, statements text[], name text
    );`);

  const { rows } = await client.query("select version from supabase_migrations.schema_migrations");
  const applied = new Set(rows.map((r) => r.version));
  const versionOf = (f) => f.slice(0, 14);

  // First run: earlier migrations were pasted into the SQL Editor, so record them rather than re-run them.
  if (!files.some((f) => applied.has(versionOf(f)))) {
    const { rows: check } = await client.query(
      `select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'profiles' and column_name = 'clerk_user_id'`
    );
    if (check.length === 0) {
      throw new Error(
        "The database doesn't look set up yet (no profiles.clerk_user_id). Run supabase/apply_all_migrations.sql once in the SQL Editor."
      );
    }
    for (const f of files.filter((f) => versionOf(f) <= BASELINE)) {
      await client.query(
        "insert into supabase_migrations.schema_migrations (version, name) values ($1, $2) on conflict do nothing",
        [versionOf(f), f.slice(15, -4)]
      );
      applied.add(versionOf(f));
    }
    console.log(`[migrate] Recorded existing migrations up to ${BASELINE} as applied.`);
  }

  const pending = files.filter((f) => !applied.has(versionOf(f)));
  if (pending.length === 0) {
    console.log("[migrate] Database is up to date.");
  }
  for (const f of pending) {
    const sql = await readFile(path.join(DIR, f), "utf8");
    console.log(`[migrate] Applying ${f} ...`);
    // One transaction per file: either all of it applies and is recorded, or none of it does.
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        "insert into supabase_migrations.schema_migrations (version, name) values ($1, $2)",
        [versionOf(f), f.slice(15, -4)]
      );
      await client.query("commit");
    } catch (err) {
      await client.query("rollback").catch(() => {});
      throw new Error(`${f} failed: ${err.message}`);
    }
    console.log(`[migrate] Applied ${f}.`);
  }
} catch (err) {
  console.error(`[migrate] ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
