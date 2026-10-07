import { NextRequest, NextResponse } from 'next/server';
import { sendPriceAlertEmail } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, rateLimit } from '@/lib/rate-limit';

// Sends a price-alert email to the signed-in user only.
// The recipient and the alert threshold come from the session and the database,
// never from the request body, so this route cannot be used to email third parties.
export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { alertId, name, currentPrice, currency } = await req.json();
        if (typeof alertId !== 'string' || typeof currentPrice !== 'number' || !Number.isFinite(currentPrice)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: alert } = await supabase
            .from('price_alerts')
            .select('id, symbol, type, price')
            .eq('id', alertId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!alert) {
            return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
        }

        const targetPrice = Number(alert.price);
        const crossed =
            (alert.type === 'above' && currentPrice >= targetPrice) ||
            (alert.type === 'below' && currentPrice <= targetPrice);
        if (!crossed) {
            return NextResponse.json({ error: 'Alert not triggered' }, { status: 400 });
        }

        // One email per alert per day, and a daily cap per user
        const firstForAlert = await rateLimit(`email:alert:${user.id}:${alert.id}`, 1, 86400);
        const underDailyCap = await rateLimit(`email:user:${user.id}`, 20, 86400);
        if (!firstForAlert || !underDailyCap) {
            return NextResponse.json({ error: 'Too many emails' }, { status: 429 });
        }

        await sendPriceAlertEmail({
            to: user.email,
            symbol: alert.symbol,
            name: typeof name === 'string' && name.length <= 120 ? name : alert.symbol,
            type: alert.type,
            targetPrice,
            currentPrice,
            currency: typeof currency === 'string' && currency.length <= 5 ? currency : 'USD',
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('send-alert-email error:', err);
        return NextResponse.json({ error: 'Failed to send alert email' }, { status: 500 });
    }
}
