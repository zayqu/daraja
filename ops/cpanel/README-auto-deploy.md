# Pull-based cPanel deployment

Daraja cPanel production can deploy without inbound SSH. GitHub Actions publishes a verified `cpanel-production` release, and the cPanel account periodically pulls and installs that release outbound.

The pull runner downloads the release's deploy script plus SHA-256 checksum, verifies both, installs the verified deploy runner, and invokes the existing atomic deployment/health-check/rollback flow.

Recommended cron cadence: every 5 minutes. Use `flock` so only one deploy can run at a time.

This path does not run Prisma migrations and does not delete production data.
