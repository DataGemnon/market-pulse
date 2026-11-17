-- ============================================================
-- Market Pulse MVP: live market-shock scan
-- Run once in the Supabase SQL editor (Dashboard > SQL editor > New query).
-- Before running, replace the two placeholders in section 3:
--   <APP_URL>      e.g. https://market-pulse-nine-delta.vercel.app
--   <CRON_SECRET>  the same value as the CRON_SECRET env var on Vercel
-- ============================================================

-- 1. One price sample per minute for each basket asset (written by the server only)
create table if not exists public.market_ticks (
    symbol      text not null,
    t           bigint not null,          -- unix seconds of the quote
    price       double precision not null,
    sampled_at  timestamptz not null default now(),
    primary key (symbol, t)
);
create index if not exists market_ticks_t_idx on public.market_ticks (t);
create index if not exists market_ticks_sampled_idx on public.market_ticks (sampled_at desc);
alter table public.market_ticks enable row level security;
-- no policy: only the service role (server) reads and writes ticks

-- 2. Detected shocks and their explanation (same for every user)
create table if not exists public.market_shocks (
    id                text primary key,   -- "shock-2026-11-17T15:16"
    started_at        timestamptz not null,
    ended_at          timestamptz not null,
    severity          text not null,
    assets            jsonb not null,
    explanation       jsonb,
    explain_attempts  integer not null default 0,
    created_at        timestamptz not null default now()
);
create index if not exists market_shocks_started_idx on public.market_shocks (started_at desc);
alter table public.market_shocks enable row level security;
drop policy if exists "Shocks are public" on public.market_shocks;
create policy "Shocks are public" on public.market_shocks for select using (true);

-- 3. Call the scan every minute (pg_cron + pg_net are available on every Supabase plan)
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('market-pulse-scan')
where exists (select 1 from cron.job where jobname = 'market-pulse-scan');

select cron.schedule(
    'market-pulse-scan',
    '* * * * *',
    $$
    select net.http_get(
        url := '<APP_URL>/api/cron/market-scan',
        headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'),
        timeout_milliseconds := 55000
    );
    $$
);
