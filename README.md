# iTraxx BI

Next.js 16 + Supabase business intelligence platform.

## Stack

- **Framework:** Next.js (App Router)
- **Database & Auth:** Supabase (Postgres + Auth)
- **Client:** `@supabase/supabase-js`, `@supabase/ssr` (cookie-based sessions for SSR + middleware)
- **UI:** Tailwind v4, Radix primitives, Lucide, Sonner

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

The app reads three environment variables. Set them in your host (Vercel, etc.) or in a local `.env.local`:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xhmkchduceqpubqplzcg.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_PXepzY5a9a8FtB_c8uNl1A_AHpdwELh` |
| `DATABASE_URL` *(server-side migrations only)* | `postgresql://postgres:[YOUR-PASSWORD]@db.xhmkchduceqpubqplzcg.supabase.co:5432/postgres` |

### 3. Link the Supabase project (one-time)

```bash
supabase login
supabase link --project-ref xhmkchduceqpubqplzcg
```

### 4. Apply the schema

To push the migration in `supabase/migrations/` to the linked remote project:

```bash
npm run db:push        # supabase db push
```

To reset the **local** dev database (when running `supabase start`) and re-run migrations + seed:

```bash
npm run db:reset       # supabase db reset
```

### 5. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

## Auth flows

All authentication runs through Supabase Auth — there is no NextAuth and no Prisma.

| Flow | File | API |
| --- | --- | --- |
| Sign in | `src/app/login/page.tsx` | `supabase.auth.signInWithPassword` |
| Sign up | `src/app/register/page.tsx` | `supabase.auth.signUp` (user metadata mapped to `profiles` via trigger) |
| Forgot password | `src/app/forgot-password/page.tsx` | `supabase.auth.resetPasswordForEmail` |
| Reset password | `src/app/reset-password/page.tsx` | `supabase.auth.updateUser` on the recovery session |
| Sign out | header dropdown | `supabase.auth.signOut` |
| Route guard | `src/middleware.ts` + `src/lib/supabase/middleware.ts` | refreshes session cookies, redirects unauthenticated users to `/login` |

Client-side state is exposed via the `useAuth()` hook in `src/components/providers/session-provider.tsx`, which returns `{ user, session, profile, loading, signOut, refresh }`.

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

The full schema lives in `supabase/migrations/20260521000000_initial_schema.sql`. Key tables:

- `profiles` — 1:1 with `auth.users` (id, name, role, department, etc.). Auto-populated by the `on_auth_user_created` trigger from `auth.users.raw_user_meta_data`.
- Domain tables (`projects`, `tasks`, `customers`, `vehicles`, `job_cards`, `assets`, `invoices`, `employees`, `leave_requests`, `documents`, …) reference `profiles.id` instead of a Prisma `User` table.

Row Level Security is enabled on every table with a permissive `authenticated`-only default. Tighten policies in a follow-up migration as access rules solidify.

## Seed users (local only)

`supabase/seed.sql` provisions five demo users when you `supabase db reset`:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@itrackerx.com` | `admin123` |
| Manager | `manager@itrackerx.com` | `manager123` |
| Technician | `technician@itrackerx.com` | `tech123` |
| Staff | `staff@itrackerx.com` | `staff123` |
| Viewer | `viewer@itrackerx.com` | `viewer123` |

For the **remote** Supabase project, create demo users via the dashboard or `supabase.auth.admin.createUser` — `seed.sql` only runs against local.
