import { NextRequest, NextResponse } from 'next/server';
import { sendPriceAlertEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const { email, symbol, name, type, targetPrice, currentPrice, currency } = await req.json();

        if (!email || !symbol || !type || targetPrice == null || currentPrice == null) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await sendPriceAlertEmail({
            to: email,
            symbol,
            name: name || symbol,
            type,
            targetPrice,
            currentPrice,
            currency,
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('send-alert-email error:', err);
        return NextResponse.json({ error: 'Failed to send alert email' }, { status: 500 });
    }
}
