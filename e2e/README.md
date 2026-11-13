# Live end-to-end checks

Read-only checks against the deployed app. They create nothing.

```bash
npm run test:e2e:live            # both suites
node e2e/live-visitor.cjs        # browser: sign-in page, redirects, API refusals, assets, mobile layout
node e2e/live-db-probe.cjs       # Supabase API: anonymous and forged-token reads/writes are refused
```

- `E2E_BASE_URL` overrides the site URL (default `https://itraxxbi.sinapsedi.com`).
- Needs Playwright with Chromium (`npx playwright install chromium` if it isn't installed).
- Screenshots are saved in `e2e/output/`.

## Signed-in checks (write test data)

These sign in as temporary users `e2e.<role>@example.com` (admin, manager, tech, staff, viewer and client) with Clerk sign-in tokens. They need Clerk Backend API access: set `CLERK_SECRET_KEY`, or use a network proxy that injects it for `api.clerk.com`.

```bash
node e2e/live-roles.cjs     # every role opens every page: allowed pages load cleanly, others redirect
node e2e/live-flows.cjs     # admin creates a customer, portal invite, task, ticket, deal; asks TRAXX; the client uses the portal
```

Setup: create one invitation per staff role in `public.invitations`, then create the Clerk users. The flow suite creates the client's invitation through the app.

Cleanup: run `e2e/cleanup.sql` in the Supabase SQL Editor, then `e2e/cleanup-clerk.sh`.
