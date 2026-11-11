# iTraxx BI

Next.js 16 + Supabase + Clerk business intelligence platform.

## Stack

- **Framework:** Next.js (App Router)
- **Sign-in:** Clerk (invite-only; sign-in, sign-up, password reset, invitations)
- **Database & storage:** Supabase (Postgres, Storage, row-level security), accepting Clerk session tokens via [third-party auth](https://supabase.com/docs/guides/auth/third-party/clerk)
- **Client:** `@supabase/supabase-js` with Clerk's session token as the access token
- **UI:** Tailwind v4, Radix primitives, Lucide, Sonner

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Set these in your host (Vercel, etc.) or in a local `.env.local` (gitignored):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` **(required)** | Clerk → API keys (`pk_live_…` in production, `pk_test_…` for previews/local) |
| `CLERK_SECRET_KEY` **(required, secret)** | Clerk → API keys (`sk_live_…` / `sk_test_…`) |
| `SUPABASE_SECRET_KEY` **(required, secret)** | Supabase → Project Settings → API keys. Server-only: links Clerk accounts to profiles and powers Team & Access. (Also accepted: `SUPABASE_SERVICE_ROLE_KEY`.) |
| `NEXT_PUBLIC_SITE_URL` *(recommended)* | Public URL used in invitation links, e.g. `https://itraxxbi.sinapsedi.com` |
| `NEXT_PUBLIC_SUPABASE_URL` **(required)** | `https://xhmkchduceqpubqplzcg.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` **(required)** | `sb_publishable_PXepzY5a9a8FtB_c8uNl1A_AHpdwELh` |
| `DATABASE_URL` *(server-side migrations only)* | `postgresql://postgres:[YOUR-PASSWORD]@db.xhmkchduceqpubqplzcg.supabase.co:5432/postgres` |
| `EMAIL_SERVICE` *(server-side only — secret)* | TransactMail API key. Powers outbound email (inspection reports, invoices). **Never** expose to the browser. (Also accepted: `TRANSACTMAIL_API_KEY`.) |
| `TRANSACTMAIL_BASE_URL` *(optional)* | Defaults to `https://email-service.airpayglobal.com/v1` |
| `TRANSACTMAIL_SENDER` *(optional)* | From-address for outbound email (must be authorised with the provider). Defaults to `no-reply@airpayglobal.com` |

**Env var naming — important:**

- The **browser** only receives variables prefixed with `NEXT_PUBLIC_`. The two
  Supabase values above **must** use that prefix, or the client cannot reach
  Supabase. Non-prefixed `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` are read as
  a fallback in **server** code only (`src/lib/supabase/config.ts`).
- Email is sent only from server code (`src/lib/email.ts`, used by the
  `/api/inspections/send` and `/api/invoices/send` routes) so the key never
  reaches the client. The key is read from `EMAIL_SERVICE` (or
  `TRANSACTMAIL_API_KEY`).

### 3. Connect Clerk and Supabase (one-time per environment)

1. **Clerk dashboard:** enable the **Supabase** integration (adds the `role: authenticated` claim to session tokens), set sign-up mode to **Restricted**, and enable email + password.
2. **Supabase → Authentication → Third-party auth:** add **Clerk** with your Clerk domain (production: `clerk.sinapsedi.com`; development: the `*.clerk.accounts.dev` domain from your publishable key).

### 4. Apply the schema

Push the migrations in `supabase/migrations/` to the linked project:

```bash
supabase login
supabase link --project-ref xhmkchduceqpubqplzcg
npm run db:push        # supabase db push
```

Without the CLI, paste `supabase/apply_all_migrations.sql` (all migrations in order) into the Supabase SQL Editor and run it once on an empty project.

To reset the **local** dev database (when running `supabase start`) and re-run migrations + seed:

```bash
npm run db:reset       # supabase db reset
```

### 5. Invite the first administrator

Access is invite-only, so the first admin is invited from outside the app:

```bash
ADMIN_EMAIL=you@company.com ADMIN_NAME="Your Name" SITE_URL=https://itraxxbi.sinapsedi.com \
SUPABASE_URL=... SUPABASE_SECRET_KEY=... CLERK_SECRET_KEY=... npm run invite:admin
```

Or by hand: insert a row into `public.invitations` (`email`, `name`, `role = 'ADMIN'`) in the SQL Editor, then invite the same email from Clerk → Users. After accepting, the admin invites everyone else from **Team & Access** (`/settings/team`).

### 6. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

## Auth flows

Clerk handles identity; Supabase handles data. There is no Supabase Auth sign-in, NextAuth or Prisma.

| Flow | Where | How |
| --- | --- | --- |
| Sign in / password reset | `src/app/sign-in/[[...sign-in]]/page.tsx` | Clerk `<SignIn />` in the branded `AuthLayout` |
| Accept an invitation | `src/app/sign-up/[[...sign-up]]/page.tsx` | Clerk `<SignUp />`; public sign-up is restricted |
| Invite, change role, deactivate | `src/app/(dashboard)/settings/team/page.tsx`, `src/app/api/team/*` | Admin only. Invites are Clerk invitations plus a row in `public.invitations` that decides the role |
| Route guard | `src/proxy.ts` | Clerk middleware; links the account on first sign-in (`src/lib/link-profile.ts`), applies the role page rules in `src/lib/role-access.ts`, sends unlinked or deactivated users to `/no-access` |
| Data access | `src/lib/supabase/client.ts`, `server.ts` | Supabase clients send the Clerk session token; RLS identifies the caller by its `sub` |

Old URLs (`/login`, `/register`, `/forgot-password`, `/reset-password`) redirect to the Clerk pages.

**Account linking:** on first sign-in, the Clerk account is matched by **verified email** to an existing profile, or else to a pending invitation (which creates the profile with the invited role). Anyone else gets "No access".

Client-side state is exposed via the `useAuth()` hook in `src/components/providers/session-provider.tsx`, which returns `{ user, profile, loading, signOut, refresh }`. `user.id` is the profile id, not the Clerk user id.

## Data layer

Feature pages read and write real data through Supabase using TanStack Query hooks
in `src/lib/hooks/`. The pattern (see `use-customers.ts` as the reference):

- `useX()` — `useQuery` selecting from the table
- `useCreateX()` / `useUpdateX()` / `useDeleteX()` — `useMutation` calling Supabase,
  invalidating the query, and surfacing a toast

`QueryProvider` (`src/components/providers/query-provider.tsx`) wraps the app.
The browser client is typed with `Database` from `src/lib/supabase/database.types.ts`.

**Types:** `database.types.ts` is currently hand-written for the wired ("core slice")
tables. Once the project is linked, regenerate the full, always-correct set with:

```bash
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

Row types must be `type` aliases (not `interface`) — interfaces don't satisfy
Supabase's `Record<string, unknown>` schema constraint and silently collapse
inserts/updates to `never`.

### Wiring status

| Module | Status |
| --- | --- |
| Dashboard home | ✅ KPIs + charts derived from live data |
| Customers | ✅ Wired to Supabase (full CRUD) |
| Tasks | ✅ Wired (CRUD, derived KPIs) |
| Job Cards | ✅ Wired (CRUD, derived stats) |
| Finance | ✅ Invoices + Expenses wired (CRUD, approve). Reports charts still mock |
| Tickets | ✅ Wired (tickets + comment thread) |
| Projects | ✅ Wired (CRUD; tasks/Gantt derived from tasks table) |
| Inventory | ✅ Wired (assets CRUD, low-stock alerts) |
| HR | ✅ Wired (leave requests + employee directory, linked to profiles) |
| Staff, Payslips, My-Portal | ⏳ Mock — Payslips needs a table |
| Documents | ✅ Wired — upload to a **private** Storage bucket, served via signed URLs |
| Settings | ⏳ Mock — only the company logo persists (localStorage) |
| Customer-Onboarding, Sales-Pipeline | ⏳ Mock — no backing tables yet |
| TRAXX, Meeting-AI | Simulated by design (no LLM) |

## Database schema

The schema lives in `supabase/migrations/` (combined into `supabase/apply_all_migrations.sql`). Key tables:

- `profiles` — one per person (name, role, department, `is_active`, `clerk_user_id`). Domain tables (`projects`, `tasks`, `customers`, `vehicles`, `job_cards`, `assets`, `invoices`, `employees`, `leave_requests`, `documents`, …) reference `profiles.id`.
- `invitations` — pending invites; the role a person gets on first sign-in comes only from here.

**Row-level security** (`20261110000000_lock_down_roles.sql`, `20261111000000_clerk_auth.sql`):

- Callers are identified by the Clerk token's `sub` via `profiles.clerk_user_id` (`public.current_profile_id()`).
- VIEWER is read-only; STAFF/TECHNICIAN write operational tables; MANAGER/ADMIN also write finance and HR.
- Finance tables are readable only by ADMIN, MANAGER and VIEWER.
- Deactivated users lose all data and document access.
- Only admins (or server-side code) can change a profile's role, active status, email or Clerk link; signed-in users can't create profiles.

## Demo users (local only)

`supabase/seed.sql` creates five demo **profiles** on `supabase db reset` (`admin@`, `manager@`, `technician@`, `staff@`, `viewer@itrackerx.com`). They have no passwords: invite an email in your Clerk development instance and sign in with it to use that profile.
