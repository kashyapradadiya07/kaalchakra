# Build Brief: NSE Screener + Gann/Astro Timing Tool (Phase 1 MVP)

## What we're building
A web app for Indian retail stock traders combining a rule-based stock screener with a W.D. Gann Square of 9 price-level calculator. Positioned strictly as an **educational/analytical tool — never investment advice**. No buy/sell signals, no execution, no broker order placement.

## Non-negotiable compliance rule (apply everywhere — UI copy, code comments, API responses)
- Never use: "buy", "sell", "target", "recommend", "signal", "prediction", "advice"
- Use instead: "level", "zone", "pattern", "historical frequency", "observation"
- Every page footer must show: *"This tool is for educational and informational purposes only. It does not constitute investment advice. We are not a SEBI-registered Investment Adviser or Research Analyst."*
- Apply this disclaimer text verbatim in a shared `<Disclaimer />` component used in the layout, not copy-pasted per page.

## Tech stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (Postgres + Auth)
- Deploy: Vercel
- Cron: Vercel Cron (or Supabase Edge Functions) for nightly data pull

## Data source decision (read this before building ingestion)
NSE's free Bhavcopy changed format in 2024 — it's now the "CM-UDiFF Common Bhavcopy Final (zip)" file, and NSE's site blocks plain requests without browser-like session cookies, plus rate-limits to ~3 req/sec. Scraping it directly is fragile and will eat dev time.

**Recommendation for Phase 1:** use Zerodha's Kite Connect Historical Data API (~₹500/month, official, reliable, returns clean OHLCV JSON) instead of scraping Bhavcopy. Fall back to Bhavcopy only for bulk historical backtesting data later, not for the live nightly pipeline.

## Phase 1 MVP — build this, nothing more
1. **Stock universe**: seed table with ~200 NSE stocks + NIFTY50 + BANKNIFTY (symbol, name, sector)
2. **Data ingestion**: nightly cron pulls EOD OHLCV via Kite Connect into a `daily_prices` table
3. **Screener page**:
   - Filters: price range, % change, volume spike, SMA(20/50/200) crossover, RSI
   - Sortable results table
4. **Gann Square of 9 calculator**:
   - Pure deterministic math, no external API — write as a unit-tested TS function
   - Input: a price (manual entry, or auto-filled from a stock's last close)
   - Output: ring of support/resistance price levels
   - Standalone page + embeddable component
5. **Stock detail page**: price/last-close + the Gann levels for that price, side by side
6. **Landing page** with waitlist signup
7. **Auth**: Supabase email/password + Google OAuth

## Explicitly OUT of scope for Phase 1 (do not build yet)
- Planetary/ephemeris astro module — Phase 2
- AI/pattern-recognition layer — Phase 3
- Payments/subscriptions — Phase 2
- Any broker order execution — never in early phases, may never be in scope at all given SEBI algo rules

## Suggested folder structure
```
/app
  /screener        -> screener page + filters
  /gann             -> standalone Gann calculator
  /stock/[symbol]   -> stock detail page
  /(auth)           -> login/signup
  /api/cron/ingest  -> nightly data pull route
/lib
  gann.ts           -> pure Gann Square of 9 math (unit tested)
  supabase.ts       -> client setup
  kite.ts           -> Kite Connect API wrapper
/components
  Disclaimer.tsx
  ScreenerTable.tsx
  GannWheel.tsx
```

## Build order (give Claude Code this sequence)
1. Scaffold Next.js 14 + TypeScript + Tailwind + Supabase client
2. Define Supabase schema: `stocks`, `daily_prices`, `users` (via Supabase Auth), `watchlists`
3. Write `lib/gann.ts` (Square of 9 calculation) with unit tests first — this has zero external dependencies, build it standalone before touching data ingestion
4. Build Kite Connect wrapper + nightly cron ingestion route, write 1 stock manually first to confirm the pipeline before backfilling all 200
5. Build screener UI + filter logic against `daily_prices`
6. Build stock detail page wiring screener selection → Gann calculator
7. Build landing page + auth
8. Add `<Disclaimer />` to root layout
9. Deploy to Vercel, connect cron

## Notes for Claude Code
- Treat the compliance wording rule as a hard constraint when generating any UI copy or AI-assisted text later — flag if a feature request would require SEBI RIA registration (e.g., personalized recommendations) before building it.
- Keep `gann.ts` pure and side-effect-free so it can be reused later in the Phase 2 astro overlay and Phase 3 backtesting sandbox without rewrites.
