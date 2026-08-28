# Private candidate documents on cPanel

Daraja candidate CVs and supporting documents are sensitive personal data. The
private-document runtime is therefore disabled unless its storage and malware
scanner are explicitly configured and verified.

## Current storage boundary

The application stores PDF bytes outside the repository and outside `public/`.
The database keeps only an opaque `private-document:<uuid>` locator in the
transitional `CandidateDocument.url` column. API responses do not expose that
locator.

The default private filesystem location is:

```text
/home/darajaco/.daraja/private-documents
```

`CANDIDATE_DOCUMENT_STORAGE_ROOT` may override the location, but the runtime
rejects any path inside the Daraja application/repository tree.

This local private filesystem is an interim production implementation behind a
storage boundary. A future managed private object store can replace it without
changing candidate-facing URLs or exposing permanent public file URLs.

## Malware scanner discovery

When `CANDIDATE_DOCUMENT_MALWARE_SCANNER=clamav` is enabled, Daraja discovers
`clamscan` in this order:

1. `CLAMSCAN_PATH`, when an explicit override is configured.
2. cPanel's standard ClamAV binary location:
   `/usr/local/cpanel/3rdparty/bin/clamscan`.
3. `clamscan` from the Node runtime `PATH`.

An explicit `CLAMSCAN_PATH` is authoritative. If that configured executable is
missing or fails, Daraja fails closed rather than silently falling back to a
different scanner. Without an explicit override, only a missing cPanel binary
causes the runtime to try the normal `PATH` command.

Do not infer that ClamAV is absent only because `command -v clamscan` returns no
result. cPanel commonly installs its ClamAV binaries outside a normal account
user's `PATH`.

## Activation requirements

Do not enable uploads until all of these are true:

1. `CANDIDATE_CAREER_ENABLED=true` is intentionally enabled.
2. A ClamAV-compatible `clamscan` executable is available to the Node runtime.
3. `CANDIDATE_DOCUMENT_MALWARE_SCANNER=clamav` is configured.
4. If a non-standard scanner path is required, set `CLAMSCAN_PATH` explicitly.
   The normal cPanel path does not require an override.
5. `CANDIDATE_DOCUMENT_STORAGE_ROOT` points to private storage outside the app
   tree, preferably `/home/darajaco/.daraja/private-documents`.
6. The storage directory is owned by `darajaco`, is not web-served, and is
   covered by a reviewed backup/restore and deletion process.
7. Clean-PDF and malware-test-file scans have both been verified without using
   real candidate documents.
8. Only after the above checks pass, set
   `CANDIDATE_DOCUMENT_UPLOADS_ENABLED=true`.

The feature fails closed when the scanner is missing, unavailable or returns an
error. Do not bypass the scanner to make uploads work.

## Initial file policy

The first production slice accepts only PDFs up to 4 MB. The runtime validates
both the declared MIME type and PDF signature/trailer before storage, writes
staging files with private permissions, scans them before finalising, and uses
owner-scoped authenticated download/delete routes.

DOCX, images and other attachment types should be added only after equivalent
signature validation, scanning and safe-rendering rules are implemented.

## Operational rules

- Never store candidate files under `public/` or another web-accessible path.
- Never return filesystem paths or opaque storage locators to clients.
- Never log document contents, scanner output containing private paths, or raw
  candidate files.
- Do not send CVs to third-party malware scanners without a reviewed privacy and
  processor/data-transfer assessment.
- Release rollback must not delete candidate files; application bundles and
  private candidate storage have separate lifecycles.
- Account/data deletion must remove eligible stored files as part of the future
  privacy-erasure workflow.
