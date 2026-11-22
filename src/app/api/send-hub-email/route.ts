import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { ItineraryActivity, TransportTicket, CabRentalLogistics } from '@/types';

interface HubEmailPayload {
  hubType: 'itinerary' | 'transport' | 'awards';
  tripName: string;
  destination: string;
  recipients: string[];
  // Itinerary fields
  dayNumber?: number;
  dayTitle?: string;
  date?: string;
  activities?: ItineraryActivity[];
  // Transport fields
  tickets?: TransportTicket[];
  cabLogistics?: CabRentalLogistics;
  // Awards fields
  awardsSummary?: Array<{
    title: string;
    icon: string;
    winnerName: string;
    voteCount: number;
    description: string;
  }>;
  pdfBase64?: string;
  pdfFileName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: HubEmailPayload = await req.json();
    const {
      hubType,
      tripName,
      destination,
      recipients,
      dayNumber,
      dayTitle,
      date,
      activities = [],
      tickets = [],
      cabLogistics,
      awardsSummary = [],
      pdfBase64,
      pdfFileName,
    } = body;

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      console.warn('GMAIL_USER or GMAIL_APP_PASSWORD not set. Skipping hub email dispatch.');
      return NextResponse.json({
        success: false,
        skipped: true,
        message: 'Gmail credentials not configured in environment variables (GMAIL_USER / GMAIL_APP_PASSWORD).',
      });
    }

    const rawRecipients = Array.isArray(recipients) ? [...recipients] : [];
    if (gmailUser && !rawRecipients.includes(gmailUser)) {
      rawRecipients.push(gmailUser);
    }

    const validRecipients = rawRecipients.filter(
      (email) => typeof email === 'string' && email.includes('@') && email.trim().length > 3
    );

    if (validRecipients.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid recipient email addresses configured in group members.',
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    let subject = '';
    let htmlContent = '';

    // ── 1. ITINERARY EMAIL ──
    if (hubType === 'itinerary') {
      subject = `📅 Day ${dayNumber} Schedule: ${dayTitle} • ${tripName}`;

      const activityRows = activities
        .map((act) => {
          const statusBadge =
            act.status === 'completed'
              ? '<span style="background-color: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 11px;">Completed ✅</span>'
              : act.status === 'in_progress'
              ? '<span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 11px;">In Progress ⏳</span>'
              : '<span style="background-color: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 9999px; font-weight: 600; font-size: 11px;">Upcoming 📍</span>';

          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.location)}`;

          return `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 12px; font-weight: 800; color: #059669; letter-spacing: 0.5px;">⏰ ${act.time}</span>
                ${statusBadge}
              </div>
              <h3 style="margin: 0 0 4px; font-size: 15px; color: #0f172a; font-weight: 700;">${act.title}</h3>
              <p style="margin: 0 0 8px; font-size: 13px; color: #475569;">📍 <strong>${act.location}</strong></p>
              ${act.notes ? `<p style="margin: 0 0 10px; font-size: 12px; color: #64748b; background: #f8fafc; padding: 6px 10px; border-radius: 6px;">💡 <em>${act.notes}</em></p>` : ''}
              <div style="margin-top: 6px;">
                <a href="${mapsUrl}" target="_blank" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 6px;">
                  Open in Google Maps ↗
                </a>
              </div>
            </div>
          `;
        })
        .join('');

      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f8fafc; padding: 24px 20px; border-radius: 14px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 22px;">
            <div style="display: inline-block; background: #059669; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
              ${tripName} • ${destination}
            </div>
            <h1 style="margin: 4px 0 2px; font-size: 22px; color: #0f172a; font-weight: 800;">Day ${dayNumber}: ${dayTitle}</h1>
            <p style="margin: 0; font-size: 13px; color: #64748b;">📅 Scheduled Date: <strong>${date || 'Upcoming'}</strong></p>
          </div>

          <div style="margin-bottom: 20px;">
            ${activityRows}
          </div>

          <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px;">
            Generated live from the TripSplit UPI Portal • Real-time travel schedule for group travelers.
          </div>
        </div>
      `;
    }

    // ── 2. TRANSPORT & LOGISTICS EMAIL ──
    else if (hubType === 'transport') {
      subject = `🚗 Tickets, Commute & Logistics Details • ${tripName}`;

      const ticketCards = tickets
        .map((t) => {
          const modeIcon = t.mode === 'flight' ? '✈️' : t.mode === 'train' ? '🚆' : t.mode === 'bus' ? '🚌' : '🚕';
          return `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 13px; font-weight: 700; color: #0284c7;">${modeIcon} ${t.title}</span>
                ${t.pnr ? `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 800; font-family: monospace;">PNR: ${t.pnr}</span>` : ''}
              </div>
              <p style="margin: 4px 0; font-size: 13px; color: #334155;">
                <strong>Route:</strong> ${t.departureStation} (${t.departureTime}) ➔ ${t.arrivalStation} ${t.arrivalTime ? `(${t.arrivalTime})` : ''}
              </p>
              <p style="margin: 4px 0 8px; font-size: 13px; color: #059669; font-weight: 600;">
                🪑 <strong>Seats / Berths:</strong> ${t.seatsOrBerths}
              </p>
              ${t.liveStatusUrl ? `
                <a href="${t.liveStatusUrl}" target="_blank" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 5px;">
                  Check Live Status ↗
                </a>
              ` : ''}
            </div>
          `;
        })
        .join('');

      const cabSection = cabLogistics
        ? `
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 6px; font-size: 15px; color: #92400e; font-weight: 700;">🚕 Cab & Rental Logistics</h3>
            <p style="margin: 3px 0; font-size: 13px; color: #451a03;"><strong>Vehicle:</strong> ${cabLogistics.vehicleModel} (${cabLogistics.plateNumber})</p>
            <p style="margin: 3px 0; font-size: 13px; color: #451a03;"><strong>Driver:</strong> ${cabLogistics.driverName} • <a href="tel:${cabLogistics.driverPhone}" style="color: #d97706; font-weight: 700;">${cabLogistics.driverPhone}</a></p>
            <p style="margin: 3px 0; font-size: 13px; color: #451a03;"><strong>Pickup:</strong> ${cabLogistics.pickupLocation} at ${cabLogistics.pickupTime}</p>
            ${cabLogistics.notes ? `<p style="margin: 6px 0 0; font-size: 12px; color: #78350f; background: rgba(254, 243, 199, 0.7); padding: 6px 10px; border-radius: 6px;">📝 ${cabLogistics.notes}</p>` : ''}
          </div>
        `
        : '';

      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f8fafc; padding: 24px 20px; border-radius: 14px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 22px;">
            <div style="display: inline-block; background: #0284c7; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
              ${tripName} • Transport & Logistics Hub
            </div>
            <h1 style="margin: 4px 0 2px; font-size: 22px; color: #0f172a; font-weight: 800;">Commute & Tickets Overview</h1>
            <p style="margin: 0; font-size: 13px; color: #64748b;">Keep all seat numbers, PNRs, and driver contacts handy in one tap.</p>
          </div>

          ${ticketCards}
          ${cabSection}

          <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px;">
            TripSplit UPI Travel Dispatch • Have a safe and memorable journey!
          </div>
        </div>
      `;
    }

    // ── 3. AWARDS & SUPERLATIVES EMAIL ──
    else if (hubType === 'awards') {
      subject = `🏆 Official Trip Awards & Superlatives Winners • ${tripName}`;

      const awardRows = awardsSummary
        .map((aw) => `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            <div style="font-size: 16px; font-weight: 800; color: #d97706; margin-bottom: 4px;">
              ${aw.icon} ${aw.title}
            </div>
            <div style="font-size: 14px; color: #0f172a; margin-bottom: 4px;">
              👑 Winner: <strong style="color: #059669; font-size: 15px;">${aw.winnerName}</strong> (${aw.voteCount} vote${aw.voteCount === 1 ? '' : 's'})
            </div>
            <p style="margin: 0; font-size: 12px; color: #64748b; font-style: italic;">"${aw.description}"</p>
          </div>
        `)
        .join('');

      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f8fafc; padding: 24px 20px; border-radius: 14px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 22px;">
            <div style="display: inline-block; background: #d97706; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
              ${tripName} • Post-Trip Awards
            </div>
            <h1 style="margin: 4px 0 2px; font-size: 22px; color: #0f172a; font-weight: 800;">Official Trip Superlatives</h1>
            <p style="margin: 0; font-size: 13px; color: #64748b;">The results are in! Here are the honorary titles voted by the group.</p>
          </div>

          ${awardRows}

          <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px;">
            TripSplit UPI • Celebrating unforgettable moments and great friendships!
          </div>
        </div>
      `;
    }

    const mailOptions: any = {
      from: `"Trip Hub • ${tripName}" <${gmailUser}>`,
      to: validRecipients.join(', '),
      subject,
      html: htmlContent,
    };

    if (pdfBase64 && pdfFileName) {
      mailOptions.attachments = [
        {
          filename: pdfFileName,
          content: pdfBase64,
          encoding: 'base64',
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      recipientCount: validRecipients.length,
    });
  } catch (err: any) {
    console.error('send-hub-email error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to dispatch hub email',
    });
  }
}
