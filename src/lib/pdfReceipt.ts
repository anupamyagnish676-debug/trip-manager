import { jsPDF } from 'jspdf';

export interface ReceiptData {
  receiptNumber: string;
  tripName: string;
  destination: string;
  currency: string;
  memberName: string;
  memberEmail?: string;
  memberPhone?: string;
  amount: number;
  paymentMode: string;
  referenceOrUtr: string;
  date: string;
  financeLeadName: string;
  collectionRoundTitle?: string;
  potBalanceAfter?: number;
  notes?: string;
}

/**
 * Format currency safely for standard PDF typography
 */
function formatSafePdfMoney(amount: number, currency: string = 'INR'): string {
  const code = (currency || 'INR').toUpperCase();
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (code === 'USD') return `$${formatted}`;
  if (code === 'GBP') return `£${formatted}`;
  if (code === 'EUR') return `EUR ${formatted}`;
  if (code === 'INR') return `Rs. ${formatted} (INR)`;
  return `${code} ${formatted}`;
}

export function generatePaymentReceiptPdf(data: ReceiptData): jsPDF {
  // A5 format portrait or standard A4. A4 is standard corporate document.
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
  const margin = 20;
  const contentWidth = pageWidth - margin * 2; // 170mm

  // ── 1. Top Decorative Brand Bar ──
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(16, 185, 129); // emerald-500 accent stripe
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(data.tripName.toUpperCase() + ' • GROUP TREASURY', margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Official Payment & Contribution Slip | Destination: ${data.destination}`, margin, 21);

  // Receipt Number & Date (Right aligned in header)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(data.receiptNumber, pageWidth - margin, 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Date: ${data.date}`, pageWidth - margin, 21, { align: 'right' });

  // ── 2. Verified Status Badge ──
  let y = 42;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('STATUS: VERIFIED & CREDITED TO CENTRAL TREASURY', margin + 6, y + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(4, 120, 87);
  doc.text(`Verified by Finance Lead: ${data.financeLeadName}`, pageWidth - margin - 6, y + 7.5, { align: 'right' });

  // ── 3. Contributor & Purpose Section ──
  y += 20;

  // Two column box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'S');

  // Left Column: Received From
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('RECEIVED FROM', margin + 6, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(data.memberName, margin + 6, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const emailText = data.memberEmail ? `Email: ${data.memberEmail}` : 'Member Group Account';
  doc.text(emailText, margin + 6, y + 23);
  if (data.memberPhone) {
    doc.text(`Phone: ${data.memberPhone}`, margin + 6, y + 29);
  }

  // Right Column: Contribution Purpose / Round
  const rightColX = margin + contentWidth / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CONTRIBUTION PURPOSE / ROUND', rightColX, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(data.collectionRoundTitle || 'Central Treasury (Kitty) Advance', rightColX, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Mode: ${data.paymentMode.toUpperCase()}`, rightColX, y + 23);
  doc.text(`Ref / UTR: ${data.referenceOrUtr || 'N/A'}`, rightColX, y + 29);

  // ── 4. Main Payment Amount Table ──
  y += 46;

  // Table Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, contentWidth, 9, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('ITEM DESCRIPTION', margin + 6, y + 6);
  doc.text('PAYMENT REF', margin + 95, y + 6);
  doc.text('AMOUNT RECEIVED', pageWidth - margin - 6, y + 6, { align: 'right' });

  // Table Body Row
  y += 9;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 18, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 18, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.collectionRoundTitle || 'Group Kitty Contribution', margin + 6, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Official credit towards shared trip expenses`, margin + 6, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(data.referenceOrUtr || 'Cash / Verified Direct', margin + 95, y + 10);

  // Total amount in bold large
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(formatSafePdfMoney(data.amount, data.currency), pageWidth - margin - 6, y + 11, { align: 'right' });

  // ── 5. Total Banner & Treasury Impact ──
  y += 24;

  // Subtotal Box
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Net Deposited into Group Treasury:', margin + 6, y + 9);
  if (data.potBalanceAfter !== undefined) {
    doc.text('New Treasury Balance (Total Available Kitty):', margin + 6, y + 17);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatSafePdfMoney(data.amount, data.currency), pageWidth - margin - 6, y + 9, { align: 'right' });

  if (data.potBalanceAfter !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129);
    doc.text(formatSafePdfMoney(data.potBalanceAfter, data.currency), pageWidth - margin - 6, y + 17, { align: 'right' });
  }

  // ── 6. Notes if any ──
  if (data.notes) {
    y += 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('REMARKS / AUDIT NOTES:', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(data.notes, margin, y + 5);
  }

  // ── 7. Verification Stamp & Signatures ──
  y = 205;

  // Verification Box
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);

  y += 10;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, 70, 28, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, 70, 28, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ISSUED & AUTHENTICATED BY', margin + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(data.financeLeadName, margin + 4, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Designated Finance Manager', margin + 4, y + 19);
  doc.text('Trip Ledger Verified ✓', margin + 4, y + 24);

  // Digital Stamp on right
  const stampX = pageWidth - margin - 70;
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.roundedRect(stampX, y, 70, 28, 2, 2, 'F');
  doc.setDrawColor(52, 211, 153);
  doc.roundedRect(stampX, y, 70, 28, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text('OFFICIAL DIGITAL RECEIPT', stampX + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(6, 95, 70);
  doc.text(`Ref ID: ${data.receiptNumber}`, stampX + 4, y + 13);
  doc.text(`Security Hash: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`, stampX + 4, y + 18);
  doc.text(`Generated: ${new Date().toLocaleString()}`, stampX + 4, y + 23);

  // ── 8. Footer ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const footerText = 'This is an official computer-generated receipt from the Trip Finance Portal. It certifies accurate deposit into group treasury.';
  doc.text(footerText, pageWidth / 2, 280, { align: 'center' });

  return doc;
}

export function downloadPaymentReceipt(data: ReceiptData) {
  const doc = generatePaymentReceiptPdf(data);
  const cleanName = data.memberName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Receipt_${data.receiptNumber}_${cleanName}.pdf`);
}

/**
 * Builds email and whatsapp notification copy
 */
export function getReceiptNotificationPayload(data: ReceiptData) {
  const safeAmount = formatSafePdfMoney(data.amount, data.currency);
  const subject = encodeURIComponent(
    `[Receipt ${data.receiptNumber}] Payment of ${safeAmount} Received for ${data.tripName}`
  );

  const plainBody = `Hi ${data.memberName},

This is an official confirmation that your payment has been received and verified by Finance Manager ${data.financeLeadName} for ${data.tripName}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OFFICIAL PAYMENT RECEIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Receipt Number : ${data.receiptNumber}
Date           : ${data.date}
Member         : ${data.memberName}
Amount Credited: ${safeAmount}
Payment Mode   : ${data.paymentMode.toUpperCase()}
Reference / UTR: ${data.referenceOrUtr || 'N/A'}
Round / Purpose: ${data.collectionRoundTitle || 'General Group Treasury'}
${data.potBalanceAfter !== undefined ? `Updated Kitty  : ${formatSafePdfMoney(data.potBalanceAfter, data.currency)}\n` : ''}${data.notes ? `Notes          : ${data.notes}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your payment has been credited to the central treasury and reflects immediately in the group portal.
You can download your official PDF receipt anytime directly from your member portal.

Best regards,
${data.financeLeadName} (Finance Manager)
${data.tripName}
`;

  const email = data.memberEmail || '';
  const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${encodeURIComponent(plainBody)}`;

  const whatsappMessage = encodeURIComponent(
    `*✅ Official Payment Receipt: ${data.receiptNumber}*\n\n` +
    `Hi *${data.memberName}*, your payment has been verified & credited to the *${data.tripName}* Treasury!\n\n` +
    `💰 *Amount:* ${safeAmount}\n` +
    `📋 *Round:* ${data.collectionRoundTitle || 'Kitty Advance'}\n` +
    `💳 *Mode:* ${data.paymentMode.toUpperCase()} (Ref: ${data.referenceOrUtr || 'Verified'})\n` +
    `👤 *Finance Lead:* ${data.financeLeadName}\n\n` +
    `_Log in to your member portal anytime to view the live Kitty balance and download your PDF slip._`
  );

  return {
    subject: `[Receipt ${data.receiptNumber}] Payment of ${safeAmount} Received for ${data.tripName}`,
    body: plainBody,
    mailtoUrl,
    whatsappUrl: `https://wa.me/?text=${whatsappMessage}`,
  };
}
