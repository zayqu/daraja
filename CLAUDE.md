# Daraja instructions for Claude

Before analyzing, proposing or changing code, read `docs/START-HERE.md` and `AGENTS.md` and follow them as the repository source of truth.

For every implementation task use the full Daraja loop:

**Read -> Understand -> Plan -> Edit existing implementation -> Test -> Clean up -> Update docs/progress -> Hand off**

Do not create parallel `V2`, `New*`, duplicate routes/helpers/services or wrapper patches when the existing owner can be corrected or cleanly refactored.

**Shared cPanel cron is locked.** Never replace the whole crontab (no `crontab <file>`, no `crontab -r`). Change single lines only, and keep the two required MZH lines listed in `AGENTS.md` > "Shared cPanel cron jobs (locked)". Never add an automatic deploy cron: deploys are manual (`SERVER_RULES.md` Rule 1).

**Owner communication:** The product owner is not a developer. Follow the
"Owner-facing communication (mandatory)" section of `AGENTS.md`.
Give plain-language product updates; record PR/branch/build/test details
in GitHub documentation unless explicitly requested or truly needed for action.
Do not conceal risks or report unverified changes as complete.
