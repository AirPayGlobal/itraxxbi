#!/usr/bin/env bash
# Deletes the temporary e2e.*@example.com Clerk users. Needs Clerk Backend API access
# (CLERK_SECRET_KEY, or a proxy that injects it for api.clerk.com).
set -euo pipefail
auth="Authorization: Bearer ${CLERK_SECRET_KEY:-proxy-injected}"
curl -sS "https://api.clerk.com/v1/users?limit=100&query=e2e." -H "$auth" \
  | python3 -c "import sys,json; [print(u['id']) for u in json.load(sys.stdin) if any(e['email_address'].startswith('e2e.') and e['email_address'].endswith('@example.com') for e in u['email_addresses'])]" \
  | while read -r id; do curl -sS -X DELETE "https://api.clerk.com/v1/users/$id" -H "$auth" >/dev/null && echo "deleted $id"; done
