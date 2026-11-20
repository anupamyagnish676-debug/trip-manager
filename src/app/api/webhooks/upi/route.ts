import { NextRequest, NextResponse } from 'next/server';
import { parseSmsPayment } from '@/lib/calculations';
import { Member } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawMessage, amount, sender, utr, members } = body;

    const memberList: Member[] = members || [];

    if (rawMessage) {
      // Parse raw notification or SMS
      const parsed = parseSmsPayment(rawMessage, memberList);
      return NextResponse.json({
        success: true,
        source: 'sms_parser',
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

      return NextResponse.json({
        success: true,
        source: 'structured',
        data: {
          amount: parseFloat(amount),
          senderName: sender || 'Unknown',
          utr: utr || `UTR${Date.now().toString().slice(-8)}`,
          matchedMemberId,
        },
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
