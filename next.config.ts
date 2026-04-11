import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually for local dev (Turbopack workaround).
// On Vercel/cloud, env vars come from the platform's dashboard via process.env.
function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf8');
    const vars: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const idx = line.indexOf('=');
      if (idx > 0) {
        const key = line.substring(0, idx).trim();
        const val = line.substring(idx + 1).trim();
        if (key && val) vars[key] = val;
      }
    }
    return vars;
  } catch {
    return {};
  }
}

const envVars = loadEnvLocal();

const nextConfig: NextConfig = {
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || envVars.ANTHROPIC_API_KEY || '',
    FINNHUB_API_KEY: process.env.FINNHUB_API_KEY || envVars.FINNHUB_API_KEY || '',
  },
};

export default nextConfig;
