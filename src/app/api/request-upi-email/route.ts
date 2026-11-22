import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface RequestUpiEmailPayload {
  toName: string;
  toEmail: string;
  fromName: string;
  amount: number;
  currency?: string;
  tripName: string;
  portalUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestUpiEmailPayload = await req.json();
    const {
      toName,
      toEmail,
      fromName,
      amount,
      currency = 'INR',
      tripName,
      portalUrl,
    } = body;

    if (!toEmail || !toEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid recipient email address is required.' },
        { status: 400 }
      );
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      console.warn('GMAIL_USER or GMAIL_APP_PASSWORD is not set.');
      return NextResponse.json({
        success: false,
        skipped: true,
        message: 'Gmail credentials not configured in environment variables (GMAIL_USER / GMAIL_APP_PASSWORD).',
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const formattedAmount = `${currency === 'INR' ? '₹' : currency + ' '}${amount.toLocaleString('en-IN')}`;
    const destinationUrl = portalUrl || 'https://trip-manager.vercel.app';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px 28px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">⚡ Action Required: Set Your UPI ID</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #e0f2fe;">✈️ ${tripName} • Settlement Notice</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 24px 28px;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px dashed #cbd5e1;">
            <span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #fef3c7; color: #b45309; border-radius: 999px; margin-bottom: 10px;">
              ⏳ Pending Settlement Payment
            </span>
            <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a;">
              ${fromName} is ready to pay you
            </h2>
            <div style="font-size: 34px; font-weight: 900; color: #0284c7; margin-top: 8px;">
              ${formattedAmount}
            </div>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #475569; line-height: 1.5;">
              Hi <strong>${toName}</strong>, your friend <strong>${fromName}</strong> is attempting to settle their trip dues with you via UPI QR, but you have <strong>not set your receiving UPI ID</strong> on the portal yet.
            </p>
          </div>

          <!-- Instruction Box -->
          <div style="margin: 20px 0; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 16px 20px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #0369a1;">
              📱 How to receive your ${formattedAmount}:
            </p>
            <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.6;">
              <li>Open the trip portal using the link below.</li>
              <li>Sign in with your account (<strong>${toName}</strong>).</li>
              <li>Tap the menu in the top-right corner or go to <strong>Friends & UPI</strong>.</li>
              <li>Enter your real Google Pay, PhonePe, or Paytm UPI ID (e.g. <code>9876543210@ybl</code>).</li>
            </ol>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 28px 0;">
            <a href="${destinationUrl}" target="_blank" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.25);">
              🚀 Open Portal & Enter UPI ID →
            </a>
          </div>

          <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
            Once you save your UPI ID, ${fromName} and other friends can scan your dynamic QR code and pay you in 1-click!
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 28px; text-align: center; font-size: 11px; color: #94a3b8;">
          This request was sent from the ${tripName} Trip Portal on behalf of ${fromName}.
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
      from: `"Trip Hisab (${tripName})" <${gmailUser}>`,
      to: toEmail,
      subject: `⚡ Action Required: Set your receiving UPI ID on ${tripName} Portal`,
      html: htmlContent,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: `Request email successfully sent to ${toEmail}!`,
    });
  } catch (error: any) {
    console.error('Error sending UPI request email:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to dispatch email' },
      { status: 500 }
    );
  }
}
