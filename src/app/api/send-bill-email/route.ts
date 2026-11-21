import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface SplitRecipient {
  name: string;
  email?: string;
  amount: number;
}

interface BillEmailPayload {
  tripName: string;
  destination: string;
  billTitle: string;
  category: string;
  amount: number;
  currency?: string;
  paidByName: string;
  paidAt: string;
  notes?: string;
  isPersonal?: boolean;
  recipients: string[];
  splits: SplitRecipient[];
  portalUrl?: string;
  isResend?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: BillEmailPayload = await req.json();
    const {
      tripName,
      destination,
      billTitle,
      category,
      amount,
      currency = 'INR',
      paidByName,
      paidAt,
      notes,
      isPersonal,
      recipients,
      splits,
      portalUrl,
      isResend = false,
    } = body;

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      console.warn('GMAIL_USER or GMAIL_APP_PASSWORD is not set. Skipping email dispatch.');
      return NextResponse.json({
        success: false,
        skipped: true,
        message: 'Gmail credentials not configured in environment variables (GMAIL_USER / GMAIL_APP_PASSWORD).',
      });
    }

    const rawRecipients = Array.isArray(recipients) ? [...recipients] : [];
    // Ensure the manager treasury gmail also receives a copy if not already in list
    if (gmailUser && !rawRecipients.includes(gmailUser)) {
      rawRecipients.push(gmailUser);
    }

    const validRecipients = rawRecipients.filter(
      (email) => typeof email === 'string' && email.includes('@') && email.trim().length > 3
    );

    if (validRecipients.length === 0) {
      return NextResponse.json({
        success: false,
        skipped: true,
        message: 'No recipient emails provided for notifications.',
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
    const formattedDate = new Date(paidAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const splitsHtml = (splits || [])
      .map(
        (s) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${s.name}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0f172a;">
            ${currency === 'INR' ? '₹' : currency + ' '}${s.amount.toLocaleString('en-IN')}
          </td>
        </tr>
      `
      )
      .join('');

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
        <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 24px 28px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">✈️ ${tripName}</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #d1fae5;">📍 ${destination} • Expense Notification</p>
        </div>

        <!-- Bill Details Card -->
        <div style="padding: 24px 28px;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px dashed #cbd5e1;">
            <span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: ${isResend ? '#eff6ff' : '#ecfdf5'}; color: ${isResend ? '#1d4ed8' : '#047857'}; border-radius: 999px; margin-bottom: 8px;">
              ${isResend ? '🔄 Resent Bill Statement' : isPersonal ? '👤 Personal Bill' : '🍽️ Group Bill Added'}
            </span>
            <h2 style="margin: 0; font-size: 26px; font-weight: 900; color: #0f172a;">${billTitle}</h2>
            <div style="font-size: 32px; font-weight: 900; color: #059669; margin-top: 8px;">
              ${formattedAmount}
            </div>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b;">
              Paid by <strong>${paidByName}</strong> on ${formattedDate}
            </p>
            ${notes ? `<p style="margin: 8px 0 0 0; font-size: 12px; font-style: italic; color: #475569; background: #f8fafc; padding: 8px; border-radius: 8px;">"${notes}"</p>` : ''}
          </div>

          <!-- Split Breakdown -->
          ${
            !isPersonal && splits && splits.length > 0
              ? `
            <div style="margin-top: 20px;">
              <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">
                Split Breakdown (${splits.length} Members)
              </h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                ${splitsHtml}
              </table>
            </div>
          `
              : ''
          }

          <!-- Call to Action -->
          <div style="margin-top: 28px; text-align: center;">
            <a href="${portalUrl || 'https://trip-manager.vercel.app'}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 12px; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.25);">
              Open Trip Portal →
            </a>
            <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8;">
              Log in to view complete statements, PDF receipts, and settle dues.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 16px 28px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
          Odisha Ghumming Trip Manager • Automated Trip Finance System
        </div>
      </div>
    </body>
    </html>
    `;

    const subjectPrefix = isResend ? `[Resent - ${tripName}] 🧾 Bill:` : `[${tripName}] 🧾 New Bill:`;

    const info = await transporter.sendMail({
      from: `"Trip Manager - ${tripName}" <${gmailUser}>`,
      to: validRecipients.join(', '),
      subject: `${subjectPrefix} ${billTitle} (${formattedAmount})`,
      html: htmlContent,
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      sentTo: validRecipients,
    });
  } catch (error: any) {
    console.error('Failed to send bill email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error while sending email',
      },
      { status: 500 }
    );
  }
}
