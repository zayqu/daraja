# Daraja instructions for Claude

Before analyzing, proposing or changing code, read `docs/START-HERE.md` and `AGENTS.md` and follow them as the repository source of truth.

For every implementation task use the full Daraja loop:

**Read -> Understand -> Plan -> Edit existing implementation -> Test -> Clean up -> Update docs/progress -> Hand off**

Do not create parallel `V2`, `New*`, duplicate routes/helpers/services or wrapper patches when the existing owner can be corrected or cleanly refactored.

**Shared cPanel cron is locked.** Never replace the whole crontab (no `crontab <file>`, no `crontab -r`). Change single lines only, and keep the three required lines listed in `AGENTS.md` > "Shared cPanel cron jobs (locked)".
