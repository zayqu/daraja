# Tanzania financial institution vacancy sources

This registry extends Daraja's official-source discovery using the institution websites supplied for Tanzanian banks, community banks, development finance institutions, microfinance banks, and major non-bank microfinance providers.

## Coverage rules

- Institutions already represented by a dedicated source or adapter are not duplicated here.
- NMB Bank and Stanbic Bank Tanzania remain on their dedicated official adapters.
- The additional registry contains 26 previously missing institutions.
- Discovery stays on each institution's official domain and subdomains.
- Only named vacancy links or structured `JobPosting` records are accepted.
- Generic labels such as `Email Application`, `Physical Application`, `Apply Now`, `Jobs`, or `Vacancies` are rejected.
- A zero-result cycle preserves existing records.
- Individual institution outages are reported as degraded health rather than causing destructive archival.

The registry is stored at `scraper/config/tanzania-financial-institutions.json` and is processed by `scraper/sources/tanzania-financial-institutions.js`.
