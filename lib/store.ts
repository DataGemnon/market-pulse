import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase access with the service role, for data shared by all
 * users (market ticks, detected shocks). Never import this from a client file.
 * Without SUPABASE_SERVICE_ROLE_KEY the MVP still works, with on-the-fly
 * computation instead of stored history.
 */

let client: SupabaseClient | null = null;

export function isStoreConfigured(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getStore(): SupabaseClient {
    if (!isStoreConfigured()) throw new Error('Supabase service role is not configured');
    client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return client;
}
