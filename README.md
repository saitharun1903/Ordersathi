# OrderSathi

Order desk for Indian electrical wholesalers. Retailers send orders as WhatsApp text, voice notes and
photos of handwritten lists; OrderSathi turns them into draft orders matched against **your**
catalogue, explains exactly what is uncertain, prices them from your database and waits for a
person to approve.

**Receive → understand → resolve ambiguity → review prices → approve → export or share.**

## Quick start

Requirements: Node 20.9+, PostgreSQL 14+.

```bash
cp .env.example .env            # set DATABASE_URL and BETTER_AUTH_SECRET
npm install
npx prisma migrate deploy       # create tables
npm run db:seed                 # sample workspace + demo users (fictional data)
npm run dev                     # http://localhost:3000
```

Production: `npm run build && npm run start`.

### Sample workspace

`npm run db:seed` creates **Sri Lakshmi Electricals (Demo)** — 42 products, 8 customers, 16 orders across
every status (English, Telugu and mixed-language; ambiguous brands, missing ratings, partial packs, an
unknown unit, a failed voice note). All businesses, people and prices are fictional demo data, and the
UI labels the workspace as a sample everywhere.

| Account | Role | Can |
|---|---|---|
| `owner@demo.ordersathi.in` | Owner | everything incl. settings & team |
| `manager@demo.ordersathi.in` | Manager | catalogue, customers, approve / reject |
| `operator@demo.ordersathi.in` | Operator | create and edit drafts |

Password for all three: `ordersathi-demo` (one-click buttons on the sign-in page; hide them with
`SHOW_DEMO_LOGIN=false`). New users can also click **Explore the sample workspace** during onboarding
to get a private copy, separate from their live workspace.

## Deploy to Vercel

1. **Import** the GitHub repo at <https://vercel.com/new> (framework: Next.js; no build settings to change —
   Vercel runs `vercel-build`, which applies migrations, seeds the sample workspace if it is missing, and builds).
2. **Add a Postgres database**: Project → Storage → *Neon* (Marketplace). This sets `DATABASE_URL` and
   `DATABASE_URL_UNPOOLED` automatically.
3. **Environment variables** (Project → Settings → Environment Variables):
   - `BETTER_AUTH_SECRET` — `openssl rand -hex 32`
   - `BETTER_AUTH_URL` — your production URL, e.g. `https://ordersathi.vercel.app`
   - `CRON_SECRET` — any random string (protects the daily retention cron in `vercel.json`)
   - optional: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` for live processing; `SHOW_DEMO_LOGIN=false` to hide demo logins
4. **Redeploy** after adding the variables (the first build needs the database to exist).

On Vercel, uploads are stored in Postgres (`STORAGE_DRIVER=database`, automatic) because functions have
no persistent disk; processing runs after the response via `after()` with a 60 s function limit.

## Processing modes

| Capability | Without keys (demo mode) | With keys (live) |
|---|---|---|
| Typed / pasted text | Deterministic rule-based parser (English, Telugu, transliterated Telugu) | Claude (`ANTHROPIC_API_KEY`) structured extraction |
| Photos of lists | Only the bundled sample photo (matched by SHA-256) | Claude vision (`ANTHROPIC_API_KEY`) |
| Voice notes | Only the bundled sample voice note | OpenAI transcription (`OPENAI_API_KEY`) |
| WhatsApp | Paste messages / upload files | Not integrated (no chat scraping) |

Unsupported uploads in demo mode are stored and fail with a clear, recoverable message — the user can
type the transcript and reprocess. The app never fabricates a result.

## How order understanding works

1. Store the upload privately (`STORAGE_DIR`, served only through an authorised route; type checked by magic bytes, size-limited).
2. Transcribe audio / read the image (provider adapter, timeout, safe error mapping).
3. Extract purchase intent — AI output is validated with Zod; prices, product ids, stock and tax are not part of the schema.
4. Match against the workspace's catalogue: customer-specific wording → catalogue aliases → product type → brand/spec constraints. AI-suggested SKUs are kept only if they exist in this workspace.
5. Price from the database (customer price beats standard price), integer paise, server-side.
6. Validate: ambiguity (“Rating not specified — both 6A and 16A sockets match”), unavailable specs, missing quantities, unknown units, missing conversions, partial packs, price changes.
7. Save a draft. Lifecycle: Draft → Needs clarification → Ready for review → Approved (or Rejected). Processing-job state is tracked separately.

Approval re-validates prices, stores an immutable snapshot (who, when, every price), and is idempotent
and concurrency-safe. Edits use optimistic locking. The confirmation PDF is labelled “Order
confirmation — not a tax invoice”. Sharing is always a user action (copy or open WhatsApp with a
pre-filled message); nothing is sent automatically or reported as delivered.

## Project layout

```
prisma/                    schema, migrations, seed
src/server/orders/         parse.ts · match.ts · evaluate.ts (pure rules) · pipeline.ts · service.ts · view.ts · pdf.ts
src/server/ai/             provider adapters (anthropic, openai, demo fixtures) + Zod schema
src/server/{catalogue,customers,workspace}/   services (every query scoped by workspaceId, permissions enforced server-side)
src/server/actions/        server actions (thin wrappers)
src/app/                   routes: dashboard, orders, orders/new, orders/[id] (review), catalogue, customers, settings, onboarding
tests/unit, tests/integration, e2e/
```

## Checks

```bash
npm run typecheck
npm run lint
npm test             # unit + integration (needs a test DB, see .env.test below)
npm run test:e2e     # Playwright; starts `npm run start` if nothing is running on :3000
```

Integration tests read `.env.test` (e.g. `DATABASE_URL=…/ordersathi_test`, `BETTER_AUTH_SECRET`,
`STORAGE_DIR=./storage-test`, empty provider keys) and apply migrations automatically.

## Operations

- `npm run retention:purge` — delete original files older than each workspace's retention window (run daily). Orders and transcripts are kept.
- Rate limiting: processing jobs per workspace (`PROCESSING_LIMIT_PER_10_MIN`); sign-in attempts are limited by better-auth.
- Logs contain ids, timings and error codes only — never message content or secrets.
