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
