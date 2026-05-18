import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Supabase email confirmation callback.
 *
 * After a user clicks the confirmation link in their inbox, Supabase redirects
 * them here with a one-time `code` param.  We exchange it for a real session
 * and then send them to the app.
 *
 * The redirect URL in the confirmation email is set in actions/auth.ts via
 * the `emailRedirectTo` option, and must also be allow-listed in:
 *   Supabase dashboard → Authentication → URL Configuration → Redirect URLs
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Successful confirmation → back to the app
            return NextResponse.redirect(`${origin}${next}`);
        }

        console.error('Auth callback: failed to exchange code for session:', error.message);
    }

    // If anything goes wrong, send user back to the homepage
    // (the auth state change listener will pick up any partial session)
    return NextResponse.redirect(`${origin}/`);
}
