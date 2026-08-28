# Pull-based cPanel deployment

Daraja cPanel production can deploy without inbound SSH. GitHub Actions publishes a verified `cpanel-production` release, and the cPanel account periodically pulls and installs that release outbound.

The pull runner downloads the release's deploy script plus SHA-256 checksum, verifies both, installs the verified deploy runner, and invokes the existing atomic deployment/health-check/rollback flow.

## Canonical single command

Every manual cPanel production deployment or deployment handoff must use and include this exact one-line command:

```bash
mkdir -p /home/darajaco/.daraja-deploy && curl -fsSL --retry 3 --connect-timeout 10 --max-time 60 https://github.com/zayqu/daraja/releases/download/cpanel-production/daraja-cpanel-auto-deploy.sh -o /home/darajaco/.daraja-deploy/daraja-cpanel-auto-deploy.sh && curl -fsSL --retry 3 --connect-timeout 10 --max-time 60 https://github.com/zayqu/daraja/releases/download/cpanel-production/daraja-cpanel-auto-deploy.sha256 -o /home/darajaco/.daraja-deploy/daraja-cpanel-auto-deploy.sha256 && (cd /home/darajaco/.daraja-deploy && sha256sum -c daraja-cpanel-auto-deploy.sha256 && bash -n daraja-cpanel-auto-deploy.sh) && install -m 0755 /home/darajaco/.daraja-deploy/daraja-cpanel-auto-deploy.sh /home/darajaco/.daraja-deploy/auto-deploy.sh && /bin/bash /home/darajaco/.daraja-deploy/auto-deploy.sh && printf '\nLive release: ' && curl -fsS --connect-timeout 10 --max-time 30 https://www.ajira.daraja.co.tz/api/health/release && printf '\n'
```

This command is intentionally self-bootstrapping. It does not assume the cPanel repository checkout already contains `ops/cpanel/auto-deploy.sh`. It downloads the current production bootstrap script and checksum from the verified GitHub release, verifies the checksum and shell syntax, installs the stable local runner at `/home/darajaco/.daraja-deploy/auto-deploy.sh`, runs the deployment, and finally prints the public live release marker.

Do not replace it with manual file copying, direct `node server.js`, pasted secrets, ad-hoc `git pull` deployment, or separate database commands.

When a model asks the operator to perform a cPanel release action, the canonical command above must be present in the handoff so the operator always receives one copy/paste command.

Recommended cron cadence: every 5 minutes. After the bootstrap has succeeded at least once and cPanel outbound DNS is stable, cron may invoke `/home/darajaco/.daraja-deploy/auto-deploy.sh` directly with `flock`.

This path does not run Prisma migrations and does not delete production data.
