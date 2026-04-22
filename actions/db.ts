'use server';

import { createClient } from '@/lib/supabase/server';
import { PriceAlert, Position } from '@/types';

// ─────────────────────────────────────────
// Watchlist
// ─────────────────────────────────────────

export async function getWatchlistFromDB(): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('watchlist')
        .select('symbol, position')
        .order('position', { ascending: true });

    if (error || !data) return [];
    return data.map((r: { symbol: string }) => r.symbol);
}

export async function saveWatchlistToDB(symbols: string[]): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upsert all symbols with their display order
    const rows = symbols.map((symbol, idx) => ({
        user_id: user.id,
        symbol,
        position: idx,
    }));

    // Delete removed symbols first
    const { data: existing } = await supabase
        .from('watchlist')
        .select('symbol')
        .eq('user_id', user.id);

    const existingSymbols = (existing || []).map((r: { symbol: string }) => r.symbol);
    const toDelete = existingSymbols.filter((s: string) => !symbols.includes(s));

    if (toDelete.length > 0) {
        await supabase
            .from('watchlist')
            .delete()
            .eq('user_id', user.id)
            .in('symbol', toDelete);
    }

    if (rows.length > 0) {
        await supabase
            .from('watchlist')
            .upsert(rows, { onConflict: 'user_id,symbol' });
    }
}

export async function addSymbolToDB(symbol: string, position: number): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('watchlist').upsert(
        { user_id: user.id, symbol, position },
        { onConflict: 'user_id,symbol' }
    );
}

export async function removeSymbolFromDB(symbol: string): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('symbol', symbol);
}

// ─────────────────────────────────────────
// Positions
// ─────────────────────────────────────────

export async function getPositionsFromDB(): Promise<Record<string, Position>> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('positions')
        .select('symbol, buy_price, quantity');

    if (error || !data) return {};

    return Object.fromEntries(
        data.map((r: { symbol: string; buy_price: number; quantity: number }) => [
            r.symbol,
            { buyPrice: r.buy_price, quantity: r.quantity },
        ])
    );
}

export async function upsertPositionToDB(symbol: string, position: Position): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('positions').upsert(
        {
            user_id: user.id,
            symbol,
            buy_price: position.buyPrice,
            quantity: position.quantity,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,symbol' }
    );
}

export async function deletePositionFromDB(symbol: string): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
        .from('positions')
        .delete()
        .eq('user_id', user.id)
        .eq('symbol', symbol);
}

// ─────────────────────────────────────────
// Price Alerts
// ─────────────────────────────────────────

export async function getAlertsFromDB(): Promise<PriceAlert[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('price_alerts')
        .select('*')
        .order('created_at', { ascending: true });

    if (error || !data) return [];

    return data.map((r: {
        id: string;
        symbol: string;
        type: 'above' | 'below';
        price: number;
        triggered: boolean;
        triggered_at: string | null;
        triggered_price: number | null;
        created_at: string;
    }) => ({
        id: r.id,
        symbol: r.symbol,
        type: r.type,
        price: r.price,
        createdAt: r.created_at,
        triggered: r.triggered,
        triggeredAt: r.triggered_at ?? undefined,
        triggeredPrice: r.triggered_price ?? undefined,
    }));
}

export async function insertAlertToDB(alert: PriceAlert): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('price_alerts').insert({
        id: alert.id,
        user_id: user.id,
        symbol: alert.symbol,
        type: alert.type,
        price: alert.price,
        triggered: false,
        created_at: alert.createdAt,
    });
}

export async function updateAlertInDB(alert: PriceAlert): Promise<void> {
    const supabase = await createClient();

    await supabase
        .from('price_alerts')
        .update({
            triggered: alert.triggered,
            triggered_at: alert.triggeredAt ?? null,
            triggered_price: alert.triggeredPrice ?? null,
        })
        .eq('id', alert.id);
}

export async function deleteAlertFromDB(alertId: string): Promise<void> {
    const supabase = await createClient();

    await supabase
        .from('price_alerts')
        .delete()
        .eq('id', alertId);
}

// ─────────────────────────────────────────
// Migration: localStorage → DB (called once on sign-in)
// ─────────────────────────────────────────

export async function migrateLocalStorageToDB(
    watchlist: string[],
    positions: Record<string, Position>,
    alerts: PriceAlert[]
): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user already has data — if so, don't overwrite
    const { data: existing } = await supabase
        .from('watchlist')
        .select('symbol')
        .eq('user_id', user.id)
        .limit(1);

    if (existing && existing.length > 0) return; // Already has data, skip migration

    // Migrate watchlist
    if (watchlist.length > 0) {
        await supabase.from('watchlist').insert(
            watchlist.map((symbol, idx) => ({ user_id: user.id, symbol, position: idx }))
        );
    }

    // Migrate positions
    const positionRows = Object.entries(positions).map(([symbol, pos]) => ({
        user_id: user.id,
        symbol,
        buy_price: pos.buyPrice,
        quantity: pos.quantity,
    }));
    if (positionRows.length > 0) {
        await supabase.from('positions').insert(positionRows);
    }

    // Migrate alerts
    const alertRows = alerts.map(a => ({
        id: a.id,
        user_id: user.id,
        symbol: a.symbol,
        type: a.type,
        price: a.price,
        triggered: a.triggered,
        triggered_at: a.triggeredAt ?? null,
        triggered_price: a.triggeredPrice ?? null,
        created_at: a.createdAt,
    }));
    if (alertRows.length > 0) {
        await supabase.from('price_alerts').insert(alertRows);
    }
}
