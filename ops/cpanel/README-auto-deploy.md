# Pull-based cPanel deployment

Daraja cPanel production can deploy without inbound SSH. GitHub Actions publishes a verified `cpanel-production` release, and the cPanel account periodically pulls and installs that release outbound.

The pull runner downloads the release's deploy script plus SHA-256 checksum, verifies both, installs the verified deploy runner, and invokes the existing atomic deployment/health-check/rollback flow.

## Canonical single command

Every manual cPanel production deployment or deployment handoff must use and include this exact one-line command:

```bash
mkdir -p /home/darajaco/.daraja-deploy && curl -fsSL --retry 3 --connect-timeout 10 --max-time 60 https://github.com/zayqu/daraja/releases/download/cpanel-production/daraja-cpanel-auto-deploy.sh -o /home/darajaco/.daraja-deploy/daraja-cpanel-auto-deploy.sh && curl -fsSL --retry 3 --connect-timeout 10 --max-time 60 https://github.com/zayqu/daraja/releases/download/cpanel-production/daraja-cpanel-auto-deploy.sha256 -o /home/darajaco/.daraja-deploy/daraja-cpanel-auto-deploy.sha256 && (cd /home/darajaco/.daraja-deploy && sha256sum -c daraja-cpanel-auto-deploy.sha256 && bash -n daraja-cpanel-auto-deploy.sh) && install -m 0755 /home/darajaco/.daraja-deploy/daraja-cpanel-auto-deploy.sh /home/darajaco/.daraja-deploy/auto-deploy.sh && /bin/bash /home/darajaco/.daraja-deploy/auto-deploy.sh && printf '\nLive release: ' && curl -fsS --connect-timeout 10 --max-time 30 https://ajira.daraja.co.tz/api/health/release && printf '\n'
```

This command is intentionally self-bootstrapping. It does not assume the cPanel repository checkout already contains `ops/cpanel/auto-deploy.sh`. It downloads the current production bootstrap script and checksum from the verified GitHub release, verifies the checksum and shell syntax, installs the stable local runner at `/home/darajaco/.daraja-deploy/auto-deploy.sh`, runs the deployment, and finally prints the public live release marker.

Do not replace it with manual file copying, direct `node server.js`, pasted secrets, ad-hoc `git pull` deployment, or separate database commands.

When a model asks the operator to perform a cPanel release action, the canonical command above must be present in the handoff so the operator always receives one copy/paste command.

This cPanel crontab is shared with MZH and is locked: never replace the whole crontab, change single lines only, and keep the two required MZH lines listed in `AGENTS.md` > "Shared cPanel cron jobs (locked)". Each deploy run re-adds a missing MZH line automatically; it never adds a deploy line.

Do not schedule this command with cron. Deploys are manual and owner-approved (`SERVER_RULES.md` Rule 1): run the command once for each new release, after checking that the account's process usage is normal (Rule 8). The production watchdog emails the owner when a published release has not been installed.

The cPanel pull path itself does not run Prisma migrations and does not delete production data. Production migrations are applied by the verified GitHub release workflow on non-PR runs before the production bundle is published, so the database schema is ready before cPanel switches runtime.
