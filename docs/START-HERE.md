# Daraja - Start Here

This is the mandatory entry point for every model or contributor before changing Daraja.

Do not rely on chat history or memory. The repository is the source of truth.

## Required start sequence

For every task, before proposing or editing code:

1. Read `AGENTS.md`.
2. Read `SECURITY.md`.
3. Read `PRODUCT.md`.
4. Read `ARCHITECTURE.md`.
5. Read `ROADMAP.md`.
6. Read `WORKSTREAMS.md`.
7. Read `DECISIONS.md`.
8. Read `PROGRESS.md` for the latest shipped state.
9. If the task touches job ingestion, read `docs/JOB-SOURCE-POLICY.md`.
10. Read the files that currently own the behavior being changed.

Do not start implementation until the current implementation and the relevant product/security decisions are understood.

## Mandatory work loop

Every task follows this loop:

**Read -> Understand -> Plan -> Edit existing implementation -> Test -> Clean up -> Update docs/progress -> Hand off**

### Read

Load the project rules and the relevant domain code. Do not assume the prompt contains all current context.

### Understand

Identify:

- the user outcome;
- the existing code path that owns the behavior;
- data/schema impact;
- authentication/authorisation/privacy impact;
- production/provider impact;
- relevant tests;
- active workstream and possible file collisions.

### Plan

Prefer the smallest coherent change that fixes the underlying behavior. State what existing files will be edited and why a new file is necessary if one is proposed.

### Edit existing implementation

Daraja follows a **modify-first, clean-replacement** rule.

Do not solve a problem by layering new code over old code when the existing owner can be corrected.

Before creating a new component, route, service, helper, adapter or model, search for the existing implementation and decide whether it should be edited, moved or replaced.

New files are appropriate only when they introduce a genuinely new responsibility or when a deliberate refactor splits an oversized responsibility. When code is moved or replaced, remove the obsolete implementation in the same change unless a documented rollback requirement temporarily requires both.

### Test

Run the narrowest relevant tests first, then the repository checks required by `AGENTS.md` and the changed domain. Never declare success only because code compiles.

### Clean up

Before handoff:

- remove dead or replaced code;
- remove unused imports, temporary logs and debugging code;
- remove obsolete comments and commented-out implementations;
- confirm there is one clear owner for the changed business rule;
- inspect the diff for duplicate logic and accidental parallel implementations.

### Update docs/progress

Update `PROGRESS.md` with meaningful completed evidence. Update `DECISIONS.md`, architecture, security or domain documentation when the change alters a durable rule or boundary.

### Hand off

Leave enough evidence that another model can continue without chat history: what changed, what remains, tests run, production status, risks and blockers.

For every cPanel production deployment handoff, include the canonical single copy/paste command from `ops/cpanel/README-auto-deploy.md`. Do not split deployment and release verification into multiple operator commands when that canonical command applies.

## No patch-on-patch rule

Daraja must not accumulate layers of temporary fixes as its normal development style.

Avoid:

- `ComponentV2`, `NewComponent`, `NewNewComponent` or similar duplicates instead of replacing the owner;
- a second API route that shadows an existing route for the same capability;
- duplicate helpers/services implementing the same business rule;
- wrappers whose only purpose is to hide a known broken implementation;
- monkey patches or runtime overrides when the owned source can be fixed;
- commented-out old implementations left beside the replacement;
- permanent `legacy` and `new` paths without an explicit migration/removal plan;
- fallback branches that silently preserve wrong behavior;
- copy-pasting an existing module just to modify a few lines.

A temporary compatibility path is allowed only when production safety genuinely requires staged migration. It must have a documented removal condition and must not become the new permanent architecture by accident.

For production emergencies, a bounded hotfix is acceptable when necessary to restore service. The root cause must still be identified and the temporary workaround must have an explicit cleanup plan.

## Source of truth

When documents conflict, follow the precedence defined in `AGENTS.md` and resolve the inconsistency in the same workstream when practical.

A model that cannot inspect the repository or run the required validation must say so rather than inventing implementation state.
