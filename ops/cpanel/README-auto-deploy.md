# Pull-based cPanel deployment

Daraja cPanel production can deploy without inbound SSH. GitHub Actions publishes a verified `cpanel-production` release, and the cPanel account periodically pulls and installs that release outbound.

The pull runner downloads the release's deploy script plus SHA-256 checksum, verifies both, installs the verified deploy runner, and invokes the existing atomic deployment/health-check/rollback flow.

## Canonical single command

Every manual cPanel production deployment or deployment handoff must use and include this exact one-line command:

```bash
/bin/bash /home/darajaco/repositories/daraja/ops/cpanel/auto-deploy.sh && printf '\nLive release: ' && curl -fsS --connect-timeout 10 --max-time 30 https://www.ajira.daraja.co.tz/api/health/release && printf '\n'
```

This one command performs the verified pull deployment first and then prints the public live release marker. Do not replace it with manual file copying, direct `node server.js`, pasted secrets, ad-hoc `git pull` deployment, or separate database commands.

When a model asks the operator to perform a cPanel release action, the canonical command above must be present in the handoff so the operator always receives one copy/paste command.

Recommended cron cadence: every 5 minutes. Use `flock` so only one deploy can run at a time.

This path does not run Prisma migrations and does not delete production data.
