# BuildFin × BuildReport — Platform Integration Guide

This document is shared by both modules (`Finance-Module` and `Report-Builder-`).
It explains how the two modules fit a construction SaaS platform, how they
exchange data today, how to deploy them together, and what remains before a
multi-tenant launch.

---

## 1. How the big platforms split finance and reporting

| Platform | Positioning | Lesson for us |
|---|---|---|
| **Procore** | Enterprise GC platform. Project Financials (budget, commitments, change events, invoicing) + field tools + cross-tool "360 Reporting". | A change on the financial side (budget change, change event) automatically surfaces everywhere else. Reporting pulls **one** source of truth per number. |
| **Autodesk Construction Cloud (Build + Cost)** | Design/BIM-centric; Cost Management feeds budgets, contracts and change orders into field reports and dashboards. | Cost data is owned by the cost module; field/docs modules only *read* it. |
| **Oracle Aconex / Primavera Unifier** | Document control + project controls for large infrastructure. | Strong audit trail: every published figure is traceable to a snapshot and a timestamp. |
| **Buildertrend / JobTread** | Residential: estimates → budget → invoices → client portal in one flow. | Owner-facing reports must show live budget vs. actual and billing status. |

The shared pattern, which these modules now follow:

1. **One system of record per domain.** Finance owns money (budgets, commitments, actual cost, billing, collections, retention, change-order values). Report Builder owns field execution and documents (daily logs, site records, templates, generated reports).
2. **Publish, don't copy by hand.** The financial owner publishes a versioned, validated snapshot. Consumers display it read-only and link back to the source.
3. **Deep links both ways.** From any number you can jump to the tool that owns it.
4. **Numbers never come from the AI.** Money figures in reports are rendered deterministically. AI only writes commentary.

Sources: Procore [Project Financials](https://www.procore.com/project-financials), [Change Events](https://support.procore.com/products/online/user-guide/project-level/change-events/tutorials/about-change-events) and [360 Reporting](https://en-ca.support.procore.com/products/online/user-guide/project-level/reports); market positioning from [PlanRadar 2026 comparison](https://www.planradar.com/us/the-15-best-construction-management-software-tools-in-2026-compared-honestly/) and [Archdesk](https://archdesk.com/blog/compare-archdesk-procore-acc-buildertrend).

### Where the incumbents fall short, and what we do instead

| Known gap (from 2026 reviews) | Our answer |
|---|---|
| Procore's accounting integration is described as "sub-par", with very limited ERP sync ([projul](https://projul.com/competitors/procore-vs-buildertrend/), [US Tech Automations](https://ustechautomations.com/resources/blog/procore-vs-buildertrend-2026)) | Finance *is* the accounting side. Budget, commitments, AR, retention and change orders flow into reports through a validated contract, with no third-party sync. |
| Change orders "still need a person to update the invoice" or reports, in both Procore and Buildertrend (same sources) | Change orders are mirrored automatically on every sync. Manual field COs are preserved. |
| Buildertrend has no native accounting integration, so estimates are re-keyed | **Enter once:** the contractor creates the project in Finance, and one click creates the field project, client and builder in Report Builder. |
| Revision history is strong for drawings (Procore sheet overlays), weak for generated reports | Every report revision is archived in full, server-side. Any version can be viewed read-only or restored as a new version. Each version records which Finance sync its numbers came from. |
| AI report writers can invent numbers | Money is rendered deterministically from the snapshot. AI writes commentary only. |
| Heavy onboarding ("someone's entire job to manage it for the first year") ([Capterra](https://www.capterra.com/p/70092/Buildertrend/reviews/)) | Two focused modules with deep links. Report forms are pre-filled from Finance. |

---

## 2. The contractor workflow (end to end)

1. **Finance → Projects & Budget → New Project.** The contractor enters everything once: code, name, type, client, PM, site address, dates, contract value, budget envelope, retention and tags. Budgets, cost codes, change orders, invoices, bills and payments are then managed in Finance as usual.
2. **Project sheet → Report Builder → "Create in Report Builder".** This creates the field project, with the client and the contractor's own company as the report "builder". The live financial snapshot is attached. The call is idempotent, so pressing it again just refreshes. **"Sync financials"** republishes figures at any time.
3. **"Generate report"** opens Report Builder with the project, builder and client pre-selected. Pick a template; the **Financial Summary (Live)**, Budget, Cost Forecast and Change Order sections use the Finance numbers.
4. **Iterate.** Edit sections, regenerate with AI, sign, approve. Every content change archives the previous version, bumps `vN`, and records what changed ("Changed: Budget Status, …").
5. **Version History.** Open any earlier version read-only in the same viewer (print/PDF works too), or **Restore** it. A restore creates a new version, never rewrites history, clears signatures that attested to other content, and sends the report back to *In Review*.

---

## 3. What the integration does today

```
 ┌──────────── Finance (BuildFin) ────────────┐            ┌──────────── Report Builder (BuildReport) ────────────┐
 │ Projects & Budget → project sheet           │            │                                                      │
 │   "Link & sync" / "Sync financials"         │            │  /api/integration/v1/projects            (GET)       │
 │        │ buildProjectSnapshot() (engines)   │            │  /api/integration/v1/projects/:id/financials (PUT/GET)│
 │        ▼                                    │  Bearer    │        │ zod-validated against the contract         │
 │ /api/integrations/report-builder/* (proxy) ─┼──────────▶ │        ▼                                             │
 │   holds REPORT_BUILDER_API_KEY server-side  │  key       │  project.finance = snapshot  (+ audit history in     │
 │                                             │            │  finance_snapshots); budget, spend, category lines   │
 │ ◀── "Open in Finance" deep link ────────────┼────────────┤  and change orders mirrored onto the project         │
 │     /projects-budget?project=<id>           │            │                                                      │
 │ ─── "Generate report" deep link ────────────┼──────────▶ │  /reports/generate?projectId=<id>                    │
 └─────────────────────────────────────────────┘            │  Report sections: Budget, Cost Forecast, Change      │
                                                            │  Orders, and the new "Financial Summary (Live)"      │
                                                            └──────────────────────────────────────────────────────┘
```

* **Contract:** `integration/contract.ts`, byte-identical in both repos and pinned by `integration/contract.sha256`. CI fails if either copy drifts. The snapshot covers contract value (original, approved COs, revised), budget (original, revised, committed, actual, remaining, EAC, variance, utilization, progress, health), billing (invoiced, collected, outstanding, overdue, retention held), profitability (gross and forecast margin), category lines, change orders and 12 months of cash flow.
* **Report Builder** mirrors the snapshot onto `totalBudget`, `spentBudget`, `budgetBreakdown` and `changeOrders`. Finance change orders are prefixed `fin-`; manually entered ones are kept. The existing Budget and Cost Forecast sections therefore use real data automatically. The new **Financial Summary (Live)** section renders exact figures in the project's currency, and the AI prompt treats the snapshot as authoritative.
* **Finance** auto-matches Report Builder projects by code, then by name. It stores the link on `project.integrations.reportBuilder` and records the last sync time.
* **Report Builder's project page** shows a live Financials card with an "Open in Finance" link.

---

### API surface

| Endpoint | Module | Purpose |
|---|---|---|
| `GET /api/integration/v1/projects` | Report Builder | List projects for linking (bearer) |
| `POST /api/integration/v1/projects` | Report Builder | Create/refresh project + client + builder from Finance (bearer, idempotent) |
| `PUT/GET /api/integration/v1/projects/:id/financials` | Report Builder | Publish/read the financial snapshot (bearer) |
| `GET /api/reports/:id/versions` | Report Builder | List archived versions |
| `GET /api/reports/:id/versions/:n` | Report Builder | Full content of version *n* |
| `POST /api/reports/:id/versions/:n/restore` | Report Builder | Restore *n* as a new version (409 if identical to current) |
| `/api/integrations/report-builder/*` | Finance | Server-side proxy holding the API key |

## 4. Deploying the two modules together

| Variable | Module | Purpose |
|---|---|---|
| `MONGODB_URI`, `MONGODB_DB_NAME` | Report Builder | Database |
| `INTEGRATION_API_KEY` | Report Builder | Shared secret for `/api/integration/v1`. **Required in production**; without it the API returns 503. |
| `NEXT_PUBLIC_FINANCE_URL` | Report Builder | "Open in Finance" links. Set it **before `npm run build`**, because `NEXT_PUBLIC_*` values are inlined at build time. |
| `REPORT_BUILDER_URL` | Finance | Server-to-server base URL of Report Builder |
| `REPORT_BUILDER_API_KEY` | Finance | Same value as `INTEGRATION_API_KEY` |
| `REPORT_BUILDER_PUBLIC_URL` | Finance | Browser-facing Report Builder URL (defaults to `REPORT_BUILDER_URL`) |
| `FRAME_ANCESTORS` | both | Origins allowed to iframe the module (e.g. the parent SaaS shell) |

Generate the shared key with `openssl rand -hex 32`. Health checks: `GET /api/health` on both (Report Builder also pings MongoDB).

**Recommended topology inside the big SaaS:** serve both modules under one domain behind the platform gateway, e.g. `app.example.com/finance/*` and `app.example.com/reports/*` via Next.js `basePath` or a reverse proxy. SSO then covers both, and the deep links become same-origin.

---

## 5. Production hardening done in this change

Both modules:
* **Removed malware.** An obfuscated payload had been appended to `postcss.config.mjs` in both repos on Aug 31 (hidden after a run of tabs). It ran on every `next dev`/`next build`. CI now runs `scripts/check-hidden-code.mjs` **before** installing or building anything.
* Security headers: `nosniff`, HSTS, Referrer-Policy, Permissions-Policy, CSP `frame-ancestors`/`base-uri`/`form-action`/`object-src`. The `X-Powered-By` header is removed.
* `/api/health`, app-level `error.tsx` and `not-found.tsx`, and CI (hidden-code scan → contract check → typecheck → lint → build).

Report Builder:
* The generic collections API has an allowlist (no arbitrary or system collections) and rejects `$`/dotted keys (operator injection). IDs are validated and immutable, PUT no longer silently upserts (except the settings singleton), duplicate IDs return 409 on POST, and lists are capped.
* The personal Gemini key is no longer stored in or served from MongoDB. It stays in the browser only, as the UI and README already promised.
* PDF export no longer allows SSRF: JavaScript is disabled, and private, loopback, link-local and metadata hosts, `file:` and other schemes are blocked. It also has size limits and a render timeout.
* Report and template previews are sandboxed iframes (no script execution from generated HTML).
* Numbering is concurrency-safe and portable, with validated doc types. Reports now get a `reportNumber`, which was previously never assigned.
* Unique indexes on `id`, `invoiceNumber`, `reportNumber` and `(reportId, version)` are created on first connect.
* Report versioning is enforced server-side inside the reports PUT, so no client path can overwrite history. Deleting a report removes its versions.
* The edit sheet's Save button is reachable again (long sections used to push it off-screen). Builder and project addresses no longer render dangling commas.

Finance:
* The 120 ms fake latency on every repository call was removed (opt-in via `NEXT_PUBLIC_SIMULATE_LATENCY_MS`).
* The Excel export escapes cell values (HTML injection).

---

## 6. Roadmap to a multi-tenant launch (not done yet)

These are platform-level decisions for the parent SaaS, in priority order:

1. **Auth + tenancy.** Neither module authenticates users yet. Put both behind the platform's SSO (e.g. Auth.js/Clerk/WorkOS at the gateway). Add `orgId` to every document, and scope every query server-side by the session's org. Audit fields (`createdBy`) should come from the session, not the literal string `"You"`.
2. **Finance persistence.** Finance keeps all data in one LocalStorage blob per browser, so data is per-device and last-write-wins across tabs. Move it to the server:
   * Swap `createRepository` for a REST/Mongo repository. The interface is already async.
   * Move `postingEngine` (called through `hooks/usePosting.ts`) to server route handlers wrapped in database transactions. Budget and ledger updates stay atomic that way.
   * Then call `buildProjectSnapshot` on the server after each posting, so Report Builder updates automatically (event-driven) instead of on a button click.
3. **One invoice owner.** Both modules have invoices today. Keep Report Builder's GST tax-invoice engine for document generation, and let Finance own AR status and payments, or the reverse. Then sync `invoiceNumber`/`amountPaid` through the contract (add `v2` fields).
4. **Server-side totals.** Report Builder invoice totals and numbers are computed in the browser. Recompute them on the server before saving.
5. **Rate limiting** on the AI and PDF routes, and a reused browser pool for PDF export.
6. **Tests.** Contract round-trip tests (Finance snapshot → Report Builder mapping), API security tests, and Playwright smoke tests of the sync flow (the flow in §2 was verified end-to-end manually).
7. **Currency display.** Parts of Report Builder (lists, dashboards, the AI fallback tables) still hard-code `$`. The Finance-driven sections and charts use the snapshot currency. Add an org-level currency setting and use it everywhere.
8. **Visual diff between versions.** Today you can view and restore; a side-by-side section diff would match Procore's drawing overlays.
9. **Money precision.** Amounts are JS floats rounded to 2 dp. Consider integer minor units in storage before real payments go through the system.

### Changing the contract

1. Edit `integration/contract.ts` in one repo. For breaking changes, bump `FINANCE_CONTRACT_VERSION` and keep accepting the old version for one release.
2. Copy the file byte-for-byte to the other repo.
3. Run `npm run contract:hash` in both repos and commit.
