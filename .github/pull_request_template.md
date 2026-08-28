## Daraja implementation checklist

### Workstream

- Workstream:
- User outcome:
- Existing implementation owner inspected:
- Files/modules owned by this PR:

### Required reading

- [ ] `docs/START-HERE.md`
- [ ] `AGENTS.md`
- [ ] `SECURITY.md`
- [ ] `PRODUCT.md`
- [ ] `ARCHITECTURE.md`
- [ ] `ROADMAP.md`
- [ ] `WORKSTREAMS.md`
- [ ] `DECISIONS.md`
- [ ] `PROGRESS.md`
- [ ] `docs/JOB-SOURCE-POLICY.md` if job ingestion/source behavior changes

### Design and code ownership

- [ ] I found the current owner of the behavior before writing code.
- [ ] This change edits/refactors that owner instead of adding a parallel implementation.
- [ ] Any new file has a genuinely new responsibility or is part of a deliberate clean refactor.
- [ ] Replaced/dead code is removed where safe.
- [ ] No accidental `V2`, `New*`, duplicate route/helper/service, wrapper patch or commented-out old implementation remains.
- [ ] There is one clear source of truth for each changed business rule.

### Impact

Schema impact: `none` / `additive` / `high-risk`

Security/privacy impact:

Production/provider impact:

Migration/rollback requirement:

### Validation

- [ ] Targeted tests pass.
- [ ] Lint passes when applicable.
- [ ] Production build passes when applicable.
- [ ] Prisma/schema validation passes when applicable.
- [ ] Authorization/ownership tests cover protected data changes.
- [ ] Mobile/responsive/accessibility behavior was checked for UI changes.
- [ ] Diff was reviewed for duplicate logic, debug code and unrelated changes.

### Documentation and handoff

- [ ] `PROGRESS.md` updated with completed evidence.
- [ ] `DECISIONS.md`/architecture/security/domain docs updated if a durable rule changed.

**Done:**

**Pending:**

**Evidence:**

**Risks:**

**Blocked by:**
