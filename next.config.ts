import type { NextConfig } from "next";

// ANTHROPIC_API_KEY and FINNHUB_API_KEY are server-only secrets.
// They do NOT go in the `env:` block (which exposes values to the client bundle).
// Instead they are read directly via process.env inside server actions and API routes.
// In local dev, Next.js automatically loads .env.local.
// On Vercel, add them via the dashboard: Settings → Environment Variables.

const nextConfig: NextConfig = {};

export default nextConfig;
