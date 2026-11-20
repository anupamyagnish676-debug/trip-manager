import { NextRequest, NextResponse } from 'next/server';
import { parseSmsPayment } from '@/lib/calculations';
import { Member, PaymentCapture } from '@/types';
import { insertPaymentToSupabase } from '@/lib/tripService';

export async function POST(req: NextRequest) {
  try {
    // 1. Security Check: Validate Secret Token if configured
    const configuredSecret = process.env.WEBHOOK_SECRET;
    if (configuredSecret) {
      const incomingSecret =
        req.headers.get('x-webhook-secret') ||
        req.nextUrl.searchParams.get('token');

      if (incomingSecret !== configuredSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Invalid webhook secret' },
          { status: 401 }
        );
      }
    }

    const body = await req.json();
    const { rawMessage, amount, sender, utr, members, tripId } = body;

    const memberList: Member[] = members || [];
    const targetTripId = tripId || 'manali-winter-2026';

    if (rawMessage) {
      // Parse raw notification or SMS
      const parsed = parseSmsPayment(rawMessage, memberList);

      if (parsed.amount && parsed.amount > 0) {
        const paymentRecord: PaymentCapture = {
          id: `pay-${Date.now()}`,
          tripId: targetTripId,
          senderName: parsed.senderName || 'UPI Friend',
          amount: parsed.amount,
          utr: parsed.utr || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          timestamp: new Date().toISOString(),
          rawText: rawMessage,
          matchedMemberId: parsed.matchedMemberId,
          status: 'verified',
          addedToPot: true,
        };

        // Persist to Supabase if configured
        await insertPaymentToSupabase(paymentRecord);

        return NextResponse.json({
          success: true,
          source: 'sms_parser',
          payment: paymentRecord,
        });
      }

      return NextResponse.json({
        success: true,
        source: 'sms_parser_unmatched',
        data: parsed,
      });
    }

    if (amount) {
      // Direct structured webhook
      let matchedMemberId: string | undefined;
      if (sender) {
        const found = memberList.find(
          (m) =>
            m.name.toLowerCase().includes(sender.toLowerCase()) ||
            (m.upiId && m.upiId.toLowerCase().includes(sender.toLowerCase()))
        );
        matchedMemberId = found?.id;
      }

      const paymentRecord: PaymentCapture = {
        id: `pay-${Date.now()}`,
        tripId: targetTripId,
        senderName: sender || 'UPI Sender',
        amount: parseFloat(amount),
        utr: utr || `UTR${Date.now().toString().slice(-8)}`,
        timestamp: new Date().toISOString(),
        matchedMemberId,
        status: 'verified',
        addedToPot: true,
      };

      await insertPaymentToSupabase(paymentRecord);

      return NextResponse.json({
        success: true,
        source: 'structured',
        payment: paymentRecord,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Provide either rawMessage or amount+sender' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
