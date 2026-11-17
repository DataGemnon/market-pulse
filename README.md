This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## MVP features and their settings

| Feature | Where | Needs |
|---|---|---|
| Market shocks (multi-asset basket, cause found by Claude, impact on the watchlist) | `lib/shocks`, `/api/shocks`, `/api/cron/market-scan` | `EODHD_API_KEY`; for minute-by-minute live scan: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` and `supabase/mvp.sql` run once |
| Official publications of the watchlist (SEC EDGAR, AMF/DILA) | `lib/filings`, `/api/watchlist-events`, `/api/filings/decode` | `SEC_USER_AGENT` (an app name and a contact email, required by the SEC) |
| Macro dates (Fed, ECB, CPI, NFP) with past watchlist reactions | `lib/macro`, `/api/macro` | calendar to update once a year in `lib/macro/calendar.ts` |
| Rating changes that move large caps (S&P 500, top 120 in Paris) | `lib/ratings`, `/api/rating-changes` | `EODHD_API_KEY` |

AI: `ANTHROPIC_API_KEY` (or `AUGUR_ANTHROPIC_API_KEY`), model `AUGUR_AI_MODEL` (default `claude-haiku-5-5`). `AUGUR_AI_MOCK=1` turns AI off; every feature then falls back to its deterministic part.

Tests: `npm test` (Vitest, real EODHD/SEC/AMF fixtures, AI mocked).
