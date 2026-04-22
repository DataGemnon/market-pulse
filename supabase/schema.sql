-- ============================================================
-- VEKTORA — Supabase Schema
-- Run this once in your Supabase project's SQL editor:
--   https://app.supabase.com → your project → SQL editor → New query
-- ============================================================

-- ─────────────────────────────────────────
-- 1. watchlist
-- ─────────────────────────────────────────
create table if not exists public.watchlist (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    symbol      text not null,
    position    integer not null default 0,   -- display order
    created_at  timestamptz not null default now(),
    unique (user_id, symbol)
);

alter table public.watchlist enable row level security;

create policy "Users can read own watchlist"
    on public.watchlist for select
    using (auth.uid() = user_id);

create policy "Users can insert own watchlist"
    on public.watchlist for insert
    with check (auth.uid() = user_id);

create policy "Users can update own watchlist"
    on public.watchlist for update
    using (auth.uid() = user_id);

create policy "Users can delete own watchlist"
    on public.watchlist for delete
    using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 2. positions  (optional buy price + qty)
-- ─────────────────────────────────────────
create table if not exists public.positions (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    symbol      text not null,
    buy_price   numeric(18, 6) not null,
    quantity    numeric(18, 6) not null,
    updated_at  timestamptz not null default now(),
    unique (user_id, symbol)
);

alter table public.positions enable row level security;

create policy "Users can read own positions"
    on public.positions for select
    using (auth.uid() = user_id);

create policy "Users can insert own positions"
    on public.positions for insert
    with check (auth.uid() = user_id);

create policy "Users can update own positions"
    on public.positions for update
    using (auth.uid() = user_id);

create policy "Users can delete own positions"
    on public.positions for delete
    using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 3. price_alerts
-- ─────────────────────────────────────────
create table if not exists public.price_alerts (
    id              text primary key,            -- client-generated "alert-<ts>-<rand>"
    user_id         uuid not null references auth.users(id) on delete cascade,
    symbol          text not null,
    type            text not null check (type in ('above', 'below')),
    price           numeric(18, 6) not null,
    triggered       boolean not null default false,
    triggered_at    timestamptz,
    triggered_price numeric(18, 6),
    created_at      timestamptz not null default now()
);

alter table public.price_alerts enable row level security;

create policy "Users can read own alerts"
    on public.price_alerts for select
    using (auth.uid() = user_id);

create policy "Users can insert own alerts"
    on public.price_alerts for insert
    with check (auth.uid() = user_id);

create policy "Users can update own alerts"
    on public.price_alerts for update
    using (auth.uid() = user_id);

create policy "Users can delete own alerts"
    on public.price_alerts for delete
    using (auth.uid() = user_id);
