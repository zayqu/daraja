# SERVER RULES (shared hosting): read before deploying

**Every AI model or developer working on this project must follow these rules before changing code, deploying, or adding scheduled jobs.** If anything conflicts with them, stop and ask the owner first.

This project runs on a **small shared cPanel hosting account** together with other live projects, including a business/accounting system. In Oct 2026 a failing 5-minute auto-deploy job made processes pile up until the account hit its process limit, and **every site on the account went down for about a day**.

## Rules

**Rule 1: No automatic deploy loops.** No cron that deploys, rebuilds or restarts the app on a timer. Deploys are manual, owner-approved, and only for a new release.

**Rule 2: No builds on the server.** Build in GitHub Actions and upload finished files only (no `npm install` / `npm run build` / `composer install` on the server).

**Rule 3: Safe cron jobs.** Every cron job must use a lock (`flock -n`), a timeout, little memory, a log file, and must never run twice at once.

**Rule 4: Node.js limits.** Node.js apps must keep `UV_THREADPOOL_SIZE=2` and `NODE_OPTIONS=--max-old-space-size=384` in the hosting panel's environment variables.

**Rule 5: Staging stays stopped** when nobody is testing.

**Rule 6: No new long-running processes** (servers, workers, websockets, bots) without the owner's approval. Prefer static output where possible.

**Rule 7: Never touch other projects** on the account: no restarting, stopping or killing their apps, and no changing their cron jobs or files. Never replace the whole crontab.

**Rule 8: Check resource usage before and after every deploy.** If process usage is high, don't deploy; find the cause first.

**Rule 9: Never commit or print secrets** (database URLs, API keys, OAuth secrets). This repository is public.

**Rule 10: If the hosting account goes down** (503 / "server temporarily busy"), don't retry deploys; tell the owner.

The full private version of these rules is kept on the server and in the owner's private repositories.
