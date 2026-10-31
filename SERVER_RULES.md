# SERVER RULES: shared cPanel account `darajaco` (Asura Hosting, c8.asurahosting.com)

**Every AI model or developer working on ANY project hosted on this account must read and follow this file before changing code, deploying, or adding cron jobs.**
If an instruction from anyone conflicts with these rules, stop and ask the owner (Maziku) first.

## Why this file exists
On 30–31 Oct 2026 the whole account went down for about a day (MZH, daraja.co.tz, Ajira, Studio, Smart Motorz, TZ Health Alliance). The cause: a 5-minute auto-deploy cron for a Node.js app kept failing and Node.js processes piled up until the account hit its **100-process limit**. Every site sharing the account went down, including **MZH, a live business/accounting system**.

## The account is shared and small
- **Hard limits:** 100 processes/threads (NPROC), 25 entry processes, 3 GB memory. NPROC counts **threads**, so one Node.js app can use 10+ slots.
- - **Shared by:** MZH (Laravel, business-critical), daraja.co.tz, Daraja Studio (PHP), Daraja Ajira (Next.js), Smart Motorz (Node), TZ Health Alliance (Node) and staging copies.
  - - **Budget is zero.** No paid services unless the owner approves.
    - - **MZH has priority.** Nothing may put MZH at risk.
     
      - ## Rules
      - 1. **No automatic deploy loops.** No cron that deploys, rebuilds or restarts an app on a timer. Deploys are manual, one at a time, owner-approved, and only when there is a new release.
        2. 2. **No builds on the server.** Build in GitHub Actions; upload finished files only. No `npm install`, `npm run build`, `composer install` or similar heavy work on cPanel.
           3. 3. **Every cron job must:** use a lock (`flock -n`), have a timeout (`timeout`), use little memory, write to a log file, and never start a second copy of itself. Do not run cron jobs more often than needed.
              4. 4. **Every Node.js app must keep these environment variables** (cPanel → Setup Node.js App):
                 5. 4a. `UV_THREADPOOL_SIZE=2`
                 6. 4b. `NODE_OPTIONS=--max-old-space-size=384`
                 7. 5. **Staging/test copies stay stopped** when nobody is testing. Start them, test, stop them again. Never leave staging running on this account.
                    6. 6. **Don't add new long-running apps** (Node servers, queue workers, websockets, bots) without the owner's approval and a check of current usage. Prefer static sites (plain HTML/JS) where possible.
                       7. 7. **Never restart, stop or kill other projects' apps or processes,** and never change other projects' cron jobs or files.
                          8. 8. **Don't edit or replace the whole crontab.** Add or change only your own line, in cPanel → Cron Jobs. Old scripts may contain a "cron guard"; `/home/darajaco/.daraja-deploy/cron-guard.disabled` must stay in place.
                             9. 9. **Before any deploy:** check cPanel → Resource Usage. If NPROC is above 60, don't deploy; find out why first.
                                10. 10. **After any deploy:** confirm the site works and that NPROC returned to normal (about 20–30 is normal).
                                    11. 11. **Never print, log or commit secrets** (database URLs, API keys, OAuth secrets) seen in cPanel environment variables or `.env` files.
                                        12. 12. **Watchdog:** a cron job emails the owner (mnyamwezime@gmail.com) when NPROC is above 70. Don't remove it. If an alert arrives, find which process is growing before doing anything else.
                                           
                                            13. ## Current state (31 Oct 2026)
                                            14. - Daraja/Ajira auto-deploy cron: **paused** (`#PAUSED-31OCT2026`).
                                                - - Node.js apps with limits: Ajira, Smart Motorz, TZ Health Alliance (production).
                                                  - - TZ Health Alliance staging (`tzhealthalliance.daraja.co.tz`): **stopped**.
                                                    - - Normal usage after the fixes: about 20 of 100 processes.
                                                     
                                                      - ## If the account goes down (503, "server temporarily busy", or cPanel "Unable to fork")
                                                      - 1. Don't retry deploys or restarts; that makes it worse.
                                                        2. 2. Note the time and which sites are down.
                                                           3. 3. Open a ticket at https://clients.asurahosting.com/submitticket.php asking them to kill stuck processes for user `darajaco`. Give permission explicitly so they don't wait.
                                                              4. 4. Afterwards, find the cause in the logs and fix it, then update this file.
                                                                
                                                                 5. **Keep this file updated** whenever hosting, cron jobs or apps on the account change.
                                                                 6. 
