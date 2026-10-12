# Steady — a prediabetes dashboard

You found out you're prediabetic and want to get back on track. Steady puts the numbers that matter in one calm place:

- **Glucose** — fingerstick readings (fasting, before/after meals) with a fasting trend and target bands.
- **Food** — describe a meal in plain English; Claude estimates carbs, protein, fat and fiber. Pair it with a before/after reading to see what actually spikes you.
- **Body** — weight trend, plus DEXA scans: upload the PDF and Claude pulls out body fat, lean mass and visceral fat.
- **Labs** — upload blood work PDFs; HbA1c, fasting glucose, insulin, lipids and the rest are extracted, standardized and tracked across tests.
- **Activity & sleep** — connect Garmin to sync steps, sleep stages, HRV, resting heart rate, stress and scale weight.
- **A short, data-driven plan** — three actions a week based on your own numbers, with a plain-language "why". It only speaks when it has data.

Every page has honest empty states, and you can load (and clear) two months of sample data to see it working before you enter anything.

> For personal tracking and education only. Not medical advice.

## Run it locally (no database setup needed)

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, create an account, and go. With no `DATABASE_URL` set, the app uses [PGlite](https://pglite.dev) (embedded Postgres) stored in `.data/pg`; the schema migrates itself on first use.

Optional, in `.env.local` (see `.env.example`):

| Variable | Enables |
|---|---|
| `ANTHROPIC_API_KEY` | Meal macro estimates, DEXA and lab PDF extraction |
| `TOKEN_ENCRYPTION_KEY` + `GARMIN_SERVICE_SECRET` | Garmin sync (plus the Python service below) |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | "Continue with Google" |
| `DATABASE_URL` | A real Postgres instead of PGlite |

Without a Claude key, food, DEXA and labs fall back to manual entry.

### Garmin sync locally

Garmin has no public API, so sync goes through a small Python service built on [python-garminconnect](https://github.com/cyberjunky/python-garminconnect), the same approach as [garmin-chat](https://github.com/jackantico1/garmin-chat). Needs Python 3.11+.

```bash
# terminal 1
npm run dev
# terminal 2 (creates .venv and installs requirements.txt on first run)
npm run dev:garmin
```

Set `GARMIN_SERVICE_SECRET` and `TOKEN_ENCRYPTION_KEY` in `.env.local` (any long random strings; `openssl rand -base64 32`). Next.js proxies `/api/py/*` to the service in development.

No Garmin account handy? `GARMIN_FAKE=1 npm run dev:garmin` serves realistic fake data; any email with an 8+ character password connects.

**Caveats:** accounts with two-factor authentication can't connect (Garmin's MFA flow needs one live client across two requests, which serverless can't guarantee). Your password is used once to mint tokens and is never stored; the token blob is encrypted with AES-256-GCM at rest. Syncs are limited to one per 10 minutes and 31 days per call to stay well under Garmin's unofficial rate limits.

## Deploy to Vercel

One project, two runtimes: the Next.js app plus `api/index.py` as a Python function (`vercel.json` sets its duration).

1. **Database** — add Neon from the Storage tab (or any Postgres) and copy the connection string.
2. **Environment variables**:
   ```
   DATABASE_URL=postgres://...
   BETTER_AUTH_SECRET=<openssl rand -base64 32>
   ANTHROPIC_API_KEY=sk-ant-...
   TOKEN_ENCRYPTION_KEY=<openssl rand -base64 32>
   GARMIN_SERVICE_SECRET=<openssl rand -base64 32>
   ```
   `BETTER_AUTH_URL` and `GARMIN_SERVICE_URL` default to the deployment's own URL. If preview deployments have Deployment Protection on, set `GARMIN_SERVICE_URL` to your production URL + `/api/py` so the server-to-server call isn't blocked.
3. **Migrate** — `DATABASE_URL=... npm run db:migrate` once (Neon serverless over HTTP), then `vercel --prod` or connect the repo.

## How it's put together

```
src/app/(app)/*        pages + server actions (home, glucose, food, body, labs, activity, settings)
src/lib/repo/*         Drizzle queries, always scoped by userId
src/lib/coaching/      rule-based action plan + streaks (no AI, deterministic, tested)
src/lib/food/pairing   links meals to the readings around them
src/lib/ai/            Claude: meal estimates and PDF/image extraction via structured outputs
src/lib/garmin/        token crypto, service client, sync orchestration
src/lib/demo/          sample data seeder (rows tagged source=demo, removable)
garmin_service/        FastAPI service: Garmin login + sync, normalizers, fake backend
api/index.py           Vercel entrypoint for the Python function
drizzle/               SQL migrations (generated with `npm run db:generate`)
```

Stack: Next.js 16 (App Router), React 19, Tailwind 4, Recharts, Drizzle ORM, Better Auth, PGlite / Neon, Anthropic SDK, FastAPI.

### Privacy

- Uploaded PDFs and photos are sent to Claude for extraction and **not stored**; only the numbers you confirm are saved.
- Garmin passwords are never stored. The OAuth token blob is encrypted at rest.
- Settings → Your data lets you download everything as JSON or delete the account and every row with it.

## Development

```bash
npm run typecheck   # tsc
npm run lint        # eslint
npm test            # vitest: coaching rules, glucose stats, meal pairing, marker normalization
.venv/bin/python -m pytest   # Python: normalizers and the FastAPI service (fake backend)
npm run db:generate # after editing src/db/schema.ts
```

## Ideas for later

CGM CSV import (Dexcom, Libre, Stelo); Apple Health export; MyFitnessPal/Cronometer import; meal photos; a weekly summary written by Claude; reminders.
