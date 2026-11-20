import { NextRequest, NextResponse } from 'next/server';
import { parseSmsPayment } from '@/lib/calculations';
import { Member, PaymentCapture } from '@/types';
import { insertPaymentToSupabase, fetchTripFromSupabase } from '@/lib/tripService';

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

    const targetTripId = tripId || 'manali-winter-2026';
    let memberList: Member[] = members || [];

    // If members not passed in payload, fetch from Supabase
    if (memberList.length === 0) {
      const trip = await fetchTripFromSupabase(targetTripId);
      if (trip) {
        memberList = trip.members;
      }
    }

    if (rawMessage) {
      // Parse raw notification or SMS
      const parsed = parseSmsPayment(rawMessage, memberList);

      if (parsed.amount && parsed.amount > 0) {
        // STRICT SAFETY CHECK: Did this payment match a real trip friend?
        const isFriendMatched = Boolean(parsed.matchedMemberId);
        const containsTripNote = /trip|pot|settle|manali|kasol|vacation/i.test(rawMessage);

        // If neither the friend's name nor a trip keyword is in the message,
        // it is an unrelated personal payment (e.g. salary, family, shop refund).
        // We do NOT add it to the trip pot!
        const isTripRelated = isFriendMatched || containsTripNote;

        const paymentRecord: PaymentCapture = {
          id: `pay-${Date.now()}`,
          tripId: targetTripId,
          senderName: parsed.senderName || 'External Sender',
          amount: parsed.amount,
          utr: parsed.utr || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          timestamp: new Date().toISOString(),
          rawText: rawMessage,
          matchedMemberId: parsed.matchedMemberId,
          // Only verified and added to pot if it actually belongs to a friend!
          status: isFriendMatched ? 'verified' : 'unassigned',
          addedToPot: isTripRelated && isFriendMatched,
        };

        if (isTripRelated) {
          // Persist to Supabase
          await insertPaymentToSupabase(paymentRecord);
          return NextResponse.json({
            success: true,
            source: 'sms_parser',
            payment: paymentRecord,
            creditedToPot: paymentRecord.addedToPot,
          });
        } else {
          // Completely ignore unrelated personal/salary credits
          return NextResponse.json({
            success: true,
            ignored: true,
            reason: 'Ignored: Sender is not a trip friend and does not contain trip keywords',
            sender: parsed.senderName,
            amount: parsed.amount,
          });
        }
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

      const isFriendMatched = Boolean(matchedMemberId);

      const paymentRecord: PaymentCapture = {
        id: `pay-${Date.now()}`,
        tripId: targetTripId,
        senderName: sender || 'UPI Sender',
        amount: parseFloat(amount),
        utr: utr || `UTR${Date.now().toString().slice(-8)}`,
        timestamp: new Date().toISOString(),
        matchedMemberId,
        status: isFriendMatched ? 'verified' : 'unassigned',
        addedToPot: isFriendMatched,
      };

      if (isFriendMatched) {
        await insertPaymentToSupabase(paymentRecord);
      }

      return NextResponse.json({
        success: true,
        source: 'structured',
        payment: paymentRecord,
        creditedToPot: isFriendMatched,
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
