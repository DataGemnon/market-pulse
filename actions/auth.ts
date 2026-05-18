'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function signUp(email: string, password: string) {
    const supabase = await createClient();

    // Build an absolute URL for the confirmation link so it works both
    // locally (localhost:3000) and in production (market-pulse.vercel.app)
    const headersList = await headers();
    const origin = headersList.get('origin') ?? 'https://market-pulse.vercel.app';

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${origin}/auth/callback`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true, message: 'Check your email to confirm your account.' };
}

export async function signIn(email: string, password: string) {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath('/', 'layout');
    redirect('/');
}

export async function getUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}
