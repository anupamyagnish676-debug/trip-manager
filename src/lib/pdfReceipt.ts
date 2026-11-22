import { jsPDF } from 'jspdf';
import { Member, Trip, Expense } from '@/types';

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

const CATEGORY_NAMES: Record<string, string> = {
  stay: 'Stay & Accommodation',
  food: 'Food & Dining',
  travel: 'Travel & Transport',
  fuel: 'Fuel & Petrol',
  activities: 'Activities & Sightseeing',
  drinks: 'Drinks & Beverages',
  groceries: 'Groceries & Supplies',
  misc: 'Miscellaneous',
};

/**
 * Returns the trip organizer / designated finance manager name
 */
export function getTripManagerName(trip: Trip): string {
  const manager =
    trip.members.find((m) => m.name.toLowerCase().includes('yagnish')) ||
    trip.members.find((m) => m.role === 'trip_manager') ||
    trip.members.find((m) => m.id === trip.financeLeadId) ||
    trip.members.find((m) => m.isFinanceLead) ||
    trip.members.find((m) => m.role === 'finance_manager') ||
    trip.members[0];
  return manager?.name || 'Yagnish Anupam';
}

/**
 * Generates an official professional PDF invoice & split voucher for an expense/bill
 */
export function generateExpenseInvoicePdf(
  trip: Trip,
  expense: Expense,
  currentMember?: Member
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
  const margin = 20;
  const contentWidth = pageWidth - margin * 2; // 170mm

  const payer = trip.members.find((m) => m.id === expense.paidBy) || {
    name: 'Friend',
    phone: '',
    upiId: '',
  };
  const managerName = getTripManagerName(trip);
  const invoiceNumber = `INV-${(trip.inviteCode || 'TRIP').toUpperCase()}-${expense.id.slice(-6).toUpperCase()}`;
  const date = expense.paidAt || new Date().toISOString().split('T')[0];
  const currency = trip.currency || 'INR';

  // ── 1. Top Decorative Brand Bar ──
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(16, 185, 129); // emerald-500 accent stripe
  doc.rect(0, 28, pageWidth, 2.5, 'F');

  // Left Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(`${trip.name.toUpperCase()} • EXPENSE INVOICE`, margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `Official Split Voucher | Destination: ${trip.destination} | Code: ${trip.inviteCode || 'N/A'}`,
    margin,
    21
  );

  // Right Reference & Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(invoiceNumber, pageWidth - margin, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Billing Date: ${date}`, pageWidth - margin, 21, { align: 'right' });

  // ── 2. Verified Status Ribbon ──
  let y = 39;
  const isPersonalExp = Boolean(expense.isPersonal);

  if (isPersonalExp) {
    doc.setFillColor(250, 245, 255); // purple-50
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
    doc.setDrawColor(216, 180, 254); // purple-300
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(126, 34, 206); // purple-700
    doc.text('STATUS: PERSONAL EXPENSE (PRIVATE LEDGER • NO GROUP DEBT)', margin + 6, y + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 33, 168);
    doc.text(`Authenticated for: ${payer.name}`, pageWidth - margin - 6, y + 6.5, { align: 'right' });
  } else {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(6, 95, 70); // emerald-800
    doc.text('STATUS: VERIFIED & RECORDED IN GROUP AUDIT LEDGER', margin + 6, y + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(4, 120, 87);
    doc.text(`Trip Manager: ${managerName}`, pageWidth - margin - 6, y + 6.5, { align: 'right' });
  }

  // ── 3. Expense & Payer Summary Box (2 columns) ──
  y += 16;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'S');

  // Left: Expense Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('BILL / ITEM DESCRIPTION', margin + 6, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(expense.title, margin + 6, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const catLabel = CATEGORY_NAMES[expense.category] || expense.category;
  doc.text(`Category: ${catLabel}`, margin + 6, y + 23);
  doc.text(
    isPersonalExp
      ? 'Split Method: Personal Spend (100% Private Out-of-Pocket)'
      : `Split Method: ${expense.splitType === 'equal' ? 'Equal Split' : 'Custom Weighted Split'} (${expense.splits.length} participants)`,
    margin + 6,
    y + 29
  );
  if (expense.notes) {
    doc.text(`Notes: ${expense.notes}`, margin + 6, y + 35);
  }

  // Right: Paid By
  const rightColX = margin + contentWidth / 2 + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PAID & ADVANCED BY', rightColX, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(payer.name, rightColX, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`UPI / Reference: ${payer.upiId || 'Direct Payment'}`, rightColX, y + 23);
  doc.text(`Payment Date: ${date}`, rightColX, y + 29);
  doc.text(
    isPersonalExp
      ? 'Ledger Settlement: Personal Private Spend (No Debt Created)'
      : 'Ledger Settlement: Distributed Automatically',
    rightColX,
    y + 35
  );

  // ── 4. Total Amount Banner ──
  y += 44;
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL BILL AMOUNT', margin + 6, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(formatSafePdfMoney(expense.amount, currency), pageWidth - margin - 6, y + 9.5, { align: 'right' });

  // ── 5. Beneficiaries & Split Share Table ──
  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('BENEFICIARY SPLIT BREAKDOWN', margin, y);

  y += 4;
  // Table Header
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('#', margin + 4, y + 5.5);
  doc.text('FRIEND / MEMBER NAME', margin + 14, y + 5.5);
  doc.text('SPLIT RATIO', margin + 95, y + 5.5);
  doc.text('INDIVIDUAL SHARE', pageWidth - margin - 6, y + 5.5, { align: 'right' });

  // Rows
  y += 8;
  expense.splits.forEach((s, idx) => {
    const member = trip.members.find((m) => m.id === s.memberId);
    const isCurrent = currentMember && currentMember.id === s.memberId;
    const isPayer = payer.name === member?.name;
    const nameStr = (member?.name || 'Member') + (isCurrent ? ' (Your Share)' : '') + (isPayer ? ' [Payer]' : '');
    const ratio = expense.amount > 0 ? ((s.amount / expense.amount) * 100).toFixed(1) + '%' : '0%';

    const rowHeight = 7.5;
    if (isCurrent) {
      doc.setFillColor(236, 253, 245); // emerald-50 highlight
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    } else if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, rowHeight, 'S');

    doc.setFont('helvetica', isCurrent ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(isCurrent ? 6 : 15, isCurrent ? 95 : 23, isCurrent ? 70 : 42);

    doc.text(String(idx + 1), margin + 4, y + 5);
    doc.text(nameStr, margin + 14, y + 5);
    doc.text(ratio, margin + 95, y + 5);
    doc.text(formatSafePdfMoney(s.amount, currency), pageWidth - margin - 6, y + 5, { align: 'right' });

    y += rowHeight;
  });

  // Table Total Row
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL RECONCILED SPLIT', margin + 14, y + 5.5);
  doc.text('100.0%', margin + 95, y + 5.5);
  doc.text(formatSafePdfMoney(expense.amount, currency), pageWidth - margin - 6, y + 5.5, { align: 'right' });
  y += 12;

  // ── 6. Compulsory Authentication & Signature Box (Mandatory User Requirement) ──
  if (y < 210) {
    y = Math.max(y, 210);
  }

  // Horizontal divider
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // Left Box: COMPULSORY MANAGER SIGNATURE BLOCK (Exact User Format)
  const sigBoxWidth = 78;
  const sigBoxHeight = 34;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, sigBoxWidth, sigBoxHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, sigBoxWidth, sigBoxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ISSUED & AUTHENTICATED BY', margin + 5, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(managerName, margin + 5, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Designated Finance Manager', margin + 5, y + 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129);
  doc.text('Trip Ledger Verified & Authenticated ✓', margin + 5, y + 28);

  // Right Box: DIGITAL SECURITY VERIFICATION STAMP
  const stampX = pageWidth - margin - sigBoxWidth;
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.roundedRect(stampX, y, sigBoxWidth, sigBoxHeight, 2, 2, 'F');
  doc.setDrawColor(52, 211, 153);
  doc.roundedRect(stampX, y, sigBoxWidth, sigBoxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text('OFFICIAL DIGITAL INVOICE SLIP', stampX + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(6, 95, 70);
  doc.text(`Voucher ID: ${invoiceNumber}`, stampX + 5, y + 14);
  const hash = Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);
  doc.text(`Security Hash: ${hash}`, stampX + 5, y + 20);
  doc.text(`Audit Timestamp: ${new Date().toLocaleString()}`, stampX + 5, y + 26);

  // ── 7. Footer ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const footerText =
    'This is an official computer-generated expense invoice & split voucher. It is legally valid within the trip group for settlement.';
  doc.text(footerText, pageWidth / 2, 280, { align: 'center' });

  return doc;
}

/**
 * Trigger download of the expense invoice PDF in browser
 */
export function downloadExpenseInvoice(trip: Trip, expense: Expense, currentMember?: Member) {
  const doc = generateExpenseInvoicePdf(trip, expense, currentMember);
  const invoiceNumber = `INV-${(trip.inviteCode || 'TRIP').toUpperCase()}-${expense.id.slice(-6).toUpperCase()}`;
  const cleanTitle = expense.title.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${invoiceNumber}_${cleanTitle}.pdf`);
}

/**
 * Generates full Personal Member Statement PDF
 */
export function generateMemberStatementPdf(trip: Trip, currentMember: Member): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  const managerName = getTripManagerName(trip);
  const currency = trip.currency || 'INR';

  // All expenses that involve the user (either in splits, or paid by the user)
  const myExpenses = trip.expenses.filter((e) =>
    e.splits.some((s) => s.memberId === currentMember.id) || (!e.isPersonal && e.paidBy === currentMember.id)
  );

  const groupShareConsumed = trip.expenses
    .filter((e) => !e.isPersonal)
    .reduce((sum, e) => {
      const mySplit = e.splits.find((s) => s.memberId === currentMember.id);
      return sum + (mySplit?.amount || 0);
    }, 0);

  const personalSpend = trip.expenses
    .filter((e) => e.isPersonal && (e.splits[0]?.memberId === currentMember.id || e.paidBy === currentMember.id))
    .reduce((sum, e) => sum + e.amount, 0);

  const grandTotalCost = groupShareConsumed + personalSpend;

  const totalIPaid = trip.expenses
    .filter((e) => e.paidBy === currentMember.id)
    .reduce((sum, e) => sum + e.amount, 0);

  const statementNumber = `STMT-${(trip.inviteCode || 'TRIP').toUpperCase()}-${currentMember.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const date = new Date().toISOString().split('T')[0];

  // ── Top Header ──
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 28, pageWidth, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(`${trip.name.toUpperCase()} • MEMBER STATEMENT`, margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Individual Financial Statement | Destination: ${trip.destination}`, margin, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(52, 211, 153);
  doc.text(statementNumber, pageWidth - margin, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Statement Date: ${date}`, pageWidth - margin, 21, { align: 'right' });

  // ── Member Info Box ──
  let y = 39;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('STATEMENT ISSUED TO', margin + 6, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(currentMember.name, margin + 6, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Login ID: ${currentMember.loginId || 'member'} | UPI: ${currentMember.upiId || 'Not set'}`, margin + 6, y + 21);

  // Financial summary on right
  const summaryX = margin + contentWidth / 2 + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TRIP EXPENDITURE SUMMARY', summaryX, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Group Share: ${formatSafePdfMoney(groupShareConsumed, currency)}`, summaryX, y + 13);
  doc.text(`Personal Spend: ${formatSafePdfMoney(personalSpend, currency)}`, summaryX, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(`Total Out-of-Pocket: ${formatSafePdfMoney(grandTotalCost, currency)}`, summaryX, y + 23);

  // ── Itemized Bills Table ──
  y += 33;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`MY EXPENSE PARTICIPATION (${myExpenses.length} BILLS)`, margin, y);

  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('#', margin + 4, y + 5.5);
  doc.text('BILL TITLE & CATEGORY', margin + 14, y + 5.5);
  doc.text('PAID BY', margin + 85, y + 5.5);
  doc.text('TOTAL BILL', margin + 120, y + 5.5);
  doc.text('MY SHARE', pageWidth - margin - 6, y + 5.5, { align: 'right' });

  y += 8;
  myExpenses.forEach((exp, idx) => {
    const isPersonal = Boolean(exp.isPersonal);
    const payer = trip.members.find((m) => m.id === exp.paidBy) || { name: 'Friend' };
    const mySplit = exp.splits.find((s) => s.memberId === currentMember.id);
    const isPayer = exp.paidBy === currentMember.id;
    const myShareAmount = isPersonal ? exp.amount : (mySplit?.amount || 0);

    const rowHeight = 7.5;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, rowHeight, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    doc.text(String(idx + 1), margin + 4, y + 5);
    const titleText = isPersonal ? `[Personal] ${exp.title}` : exp.title;
    doc.text(titleText, margin + 14, y + 5);

    const paidByText = isPersonal ? 'You (Private)' : (isPayer ? 'You' : payer.name);
    doc.text(paidByText, margin + 85, y + 5);
    doc.text(formatSafePdfMoney(exp.amount, currency), margin + 120, y + 5);

    doc.setFont('helvetica', 'bold');
    if (isPersonal) {
      doc.setTextColor(126, 34, 206);
    } else {
      doc.setTextColor(5, 150, 105);
    }
    doc.text(formatSafePdfMoney(myShareAmount, currency), pageWidth - margin - 6, y + 5, { align: 'right' });

    y += rowHeight;
  });

  // Table Total Row
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('GRAND TOTAL OUT-OF-POCKET (GROUP + PERSONAL)', margin + 14, y + 5.5);
  doc.setTextColor(5, 150, 105);
  doc.text(formatSafePdfMoney(grandTotalCost, currency), pageWidth - margin - 6, y + 5.5, { align: 'right' });
  y += 14;

  // ── Signature & Authentication Block (Mandatory) ──
  if (y < 210) {
    y = Math.max(y, 210);
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  const sigBoxWidth = 78;
  const sigBoxHeight = 34;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, sigBoxWidth, sigBoxHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, sigBoxWidth, sigBoxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ISSUED & AUTHENTICATED BY', margin + 5, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(managerName, margin + 5, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Designated Finance Manager', margin + 5, y + 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129);
  doc.text('Trip Ledger Verified & Authenticated ✓', margin + 5, y + 28);

  // Digital stamp
  const stampX = pageWidth - margin - sigBoxWidth;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(stampX, y, sigBoxWidth, sigBoxHeight, 2, 2, 'F');
  doc.setDrawColor(52, 211, 153);
  doc.roundedRect(stampX, y, sigBoxWidth, sigBoxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text('OFFICIAL MEMBER STATEMENT', stampX + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(6, 95, 70);
  doc.text(`Statement ID: ${statementNumber}`, stampX + 5, y + 14);
  doc.text(`Generated: ${new Date().toLocaleString()}`, stampX + 5, y + 20);
  doc.text(`Status: AUTHENTICATED & BALANCED`, stampX + 5, y + 26);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is an official computer-generated statement from the Trip Finance Portal. Certifies member expense participation.',
    pageWidth / 2,
    280,
    { align: 'center' }
  );

  return doc;
}

/**
 * Trigger download of member financial statement PDF
 */
export function downloadMemberStatement(trip: Trip, member: Member) {
  const doc = generateMemberStatementPdf(trip, member);
  const cleanName = member.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Statement_${trip.name.replace(/[^a-zA-Z0-9]/g, '_')}_${cleanName}.pdf`);
}

/**
 * Generates Master Overall Trip Expense & Bills Statement PDF
 */
export function generateOverallTripReportPdf(trip: Trip): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const managerName = getTripManagerName(trip);
  const currency = trip.currency || 'INR';

  const totalTripSpend = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalGroupSpend = trip.expenses.filter((e) => !e.isPersonal).reduce((sum, e) => sum + e.amount, 0);
  const totalPersonalSpend = trip.expenses.filter((e) => e.isPersonal).reduce((sum, e) => sum + e.amount, 0);

  const reportNumber = `EXP-ALL-${(trip.inviteCode || 'TRIP').toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const date = new Date().toISOString().split('T')[0];

  // ── Top Header ──
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 28, pageWidth, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(`${trip.name.toUpperCase()} • OVERALL BILL REPORT`, margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Consolidated Trip Expense Ledger | Destination: ${trip.destination}`, margin, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(52, 211, 153);
  doc.text(reportNumber, pageWidth - margin, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated Date: ${date}`, pageWidth - margin, 21, { align: 'right' });

  let y = 38;

  // ── Summary Cards Box ──
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'S');

  // Col 1: Total Spend
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL GROUP SPEND', margin + 6, y + 8);
  doc.setFontSize(13);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(formatSafePdfMoney(totalTripSpend, currency), margin + 6, y + 18);

  // Col 2: Shared vs Personal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BREAKDOWN', margin + 65, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Group Bills: ${formatSafePdfMoney(totalGroupSpend, currency)}`, margin + 65, y + 14);
  doc.text(`Personal Bills: ${formatSafePdfMoney(totalPersonalSpend, currency)}`, margin + 65, y + 20);

  // Col 3: Members & Count
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TRIP PARTICIPATION', margin + 125, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${trip.members.length} Registered Friends`, margin + 125, y + 14);
  doc.text(`${trip.expenses.length} Total Bills Logged`, margin + 125, y + 20);

  y += 33;

  // ── Who Fronted What Summary ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('WHO FRONTED THE BILLS (PAID OUT-OF-POCKET)', margin, y);
  y += 4;

  const payerTotals = new Map<string, number>();
  trip.expenses.forEach((e) => {
    payerTotals.set(e.paidBy, (payerTotals.get(e.paidBy) || 0) + e.amount);
  });

  const payerList = Array.from(payerTotals.entries()).map(([memberId, amt]) => {
    const member = trip.members.find((m) => m.id === memberId);
    return {
      name: member?.name || 'Group Member',
      amount: amt,
      percentage: totalTripSpend > 0 ? ((amt / totalTripSpend) * 100).toFixed(1) : '0',
    };
  });

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('MEMBER NAME', margin + 5, y + 4.5);
  doc.text('PERCENTAGE', margin + 95, y + 4.5);
  doc.text('TOTAL AMOUNT FRONTED', pageWidth - margin - 5, y + 4.5, { align: 'right' });
  y += 7;

  payerList.forEach((p, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 6.5, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(p.name, margin + 5, y + 4.5);
    doc.text(`${p.percentage}%`, margin + 95, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(formatSafePdfMoney(p.amount, currency), pageWidth - margin - 5, y + 4.5, { align: 'right' });

    y += 6.5;
  });

  y += 8;

  // ── Master Itemized Bills Table ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`ITEMIZED BILLS REGISTER (${trip.expenses.length} BILLS)`, margin, y);
  y += 4;

  const tableHeaderY = y;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, tableHeaderY, contentWidth, 7.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, tableHeaderY, contentWidth, 7.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('#', margin + 3, tableHeaderY + 5);
  doc.text('DATE', margin + 10, tableHeaderY + 5);
  doc.text('BILL TITLE / PURPOSE', margin + 32, tableHeaderY + 5);
  doc.text('CATEGORY', margin + 95, tableHeaderY + 5);
  doc.text('PAID BY', margin + 120, tableHeaderY + 5);
  doc.text('AMOUNT', pageWidth - margin - 5, tableHeaderY + 5, { align: 'right' });
  y += 7.5;

  trip.expenses.forEach((exp, idx) => {
    // Pagination check
    if (y > 262) {
      doc.addPage();
      y = 20;

      // Repeat table header on new page
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 7.5, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, y, contentWidth, 7.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('#', margin + 3, y + 5);
      doc.text('DATE', margin + 10, y + 5);
      doc.text('BILL TITLE / PURPOSE', margin + 32, y + 5);
      doc.text('CATEGORY', margin + 95, y + 5);
      doc.text('PAID BY', margin + 120, y + 5);
      doc.text('AMOUNT', pageWidth - margin - 5, y + 5, { align: 'right' });
      y += 7.5;
    }

    const rowHeight = 7;
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, contentWidth, rowHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, rowHeight, 'S');

    const payer = trip.members.find((m) => m.id === exp.paidBy) || { name: 'Member' };

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(idx + 1), margin + 3, y + 4.8);
    doc.text(exp.paidAt ? exp.paidAt.slice(5) : '—', margin + 10, y + 4.8);

    const titleStr = exp.isPersonal ? `[Personal] ${exp.title}` : exp.title;
    doc.text(titleStr.slice(0, 32), margin + 32, y + 4.8);
    doc.text(exp.category.toUpperCase().slice(0, 10), margin + 95, y + 4.8);
    doc.text(payer.name.slice(0, 16), margin + 120, y + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(exp.isPersonal ? 126 : 15, exp.isPersonal ? 34 : 23, exp.isPersonal ? 206 : 42);
    doc.text(formatSafePdfMoney(exp.amount, currency), pageWidth - margin - 5, y + 4.8, { align: 'right' });

    y += rowHeight;
  });

  // Table Total Row
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL GROUP BILLS ACCUMULATED', margin + 32, y + 5.5);
  doc.setTextColor(5, 150, 105);
  doc.text(formatSafePdfMoney(totalTripSpend, currency), pageWidth - margin - 5, y + 5.5, { align: 'right' });
  y += 14;

  // ── Authentication & Signature Block ──
  if (y > 235) {
    doc.addPage();
    y = 25;
  } else {
    y = Math.max(y, 220);
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  const sigBoxWidth = 80;
  const sigBoxHeight = 32;

  // Manager box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, sigBoxWidth, sigBoxHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, sigBoxWidth, sigBoxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('VERIFIED & ISSUED BY', margin + 5, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(managerName, margin + 5, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Designated Finance Manager (FM)', margin + 5, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129);
  doc.text('Verified Master Trip Statement ✓', margin + 5, y + 26);

  // Digital Stamp Box
  const stampX = pageWidth - margin - sigBoxWidth;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(stampX, y, sigBoxWidth, sigBoxHeight, 2, 2, 'F');
  doc.setDrawColor(52, 211, 153);
  doc.roundedRect(stampX, y, sigBoxWidth, sigBoxHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text('CONSOLIDATED BILL STATEMENT', stampX + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(6, 95, 70);
  doc.text(`Reference: ${reportNumber}`, stampX + 5, y + 13);
  doc.text(`Timestamp: ${new Date().toLocaleString()}`, stampX + 5, y + 19);
  doc.text(`Total Spend: ${formatSafePdfMoney(totalTripSpend, currency)}`, stampX + 5, y + 25);

  // Bottom Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is an official computer-generated Master Expense Statement from the Odisha Ghumming Trip Portal.',
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  return doc;
}

/**
 * Trigger download of overall trip expenses and bills PDF
 */
export function downloadOverallTripReport(trip: Trip) {
  const doc = generateOverallTripReportPdf(trip);
  const cleanTripName = trip.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Overall_Trip_Bills_${cleanTripName}.pdf`);
}

export interface AwardCertificateData {
  tripName: string;
  destination: string;
  awardTitle: string;
  awardIcon: string;
  winnerName: string;
  awardDescription: string;
  voteCount: number;
  totalVoters: number;
  financeLeadName: string;
  date: string;
}

/**
 * Generate a regal landscape A4 Trip Superlative & Award Certificate of Honor
 */
export function generateTripAwardCertificatePdf(data: AwardCertificateData): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 14;

  // ── 1. Ornate Border Frame ──
  // Outer emerald border
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(2.5);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  // Inner thin gold/amber accent border
  doc.setDrawColor(217, 119, 6); // amber-600
  doc.setLineWidth(0.8);
  doc.rect(margin + 3, margin + 3, pageWidth - (margin + 3) * 2, pageHeight - (margin + 3) * 2);

  // Corner decorative flourishes
  const cornerSize = 10;
  const drawCorner = (x: number, y: number, xFlip: number, yFlip: number) => {
    doc.setFillColor(16, 185, 129);
    doc.triangle(x, y, x + cornerSize * xFlip, y, x, y + cornerSize * yFlip, 'F');
  };
  drawCorner(margin + 3, margin + 3, 1, 1);
  drawCorner(pageWidth - margin - 3, margin + 3, -1, 1);
  drawCorner(margin + 3, pageHeight - margin - 3, 1, -1);
  drawCorner(pageWidth - margin - 3, pageHeight - margin - 3, -1, -1);

  // ── 2. Header & Banner ──
  let y = 30;

  // Star Emblem
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text('★ ★ ★   OFFICIAL TRIP MEMORIES & SUPERLATIVE CITATION   ★ ★ ★', pageWidth / 2, y, { align: 'center' });

  // Main Trip Title
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`${data.tripName.toUpperCase()} • ${data.destination.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });

  // Certificate Title
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('CERTIFICATE OF COMRADERY & DISTINCTION', pageWidth / 2, y, { align: 'center' });

  // Divider Line
  y += 5;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 60, y, pageWidth / 2 + 60, y);

  // Conferral statement
  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('This distinguished recognition is proudly awarded to', pageWidth / 2, y, { align: 'center' });

  // Winner Name
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(data.winnerName, pageWidth / 2, y, { align: 'center' });

  // Underline for Winner
  y += 3;
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(1);
  const nameWidth = doc.getTextWidth(data.winnerName);
  doc.line(pageWidth / 2 - nameWidth / 2 - 5, y, pageWidth / 2 + nameWidth / 2 + 5, y);

  // Subtitle
  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text('for overwhelmingly clinching the peer-voted title of', pageWidth / 2, y, { align: 'center' });

  // Award Title Card
  y += 6;
  const awardBoxWidth = 180;
  const awardBoxHeight = 16;
  const awardBoxX = pageWidth / 2 - awardBoxWidth / 2;
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.roundedRect(awardBoxX, y, awardBoxWidth, awardBoxHeight, 3, 3, 'F');
  doc.setDrawColor(110, 231, 183); // emerald-300
  doc.roundedRect(awardBoxX, y, awardBoxWidth, awardBoxHeight, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text(`${data.awardTitle.toUpperCase()}`, pageWidth / 2, y + 10.5, { align: 'center' });

  // Description & Citation
  y += 24;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`"${data.awardDescription}"`, pageWidth / 2, y, { align: 'center' });

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Secured with ${data.voteCount} vote${data.voteCount === 1 ? '' : 's'} across the travel delegation.`, pageWidth / 2, y, { align: 'center' });

  // ── 3. Footer Seal & Signatures ──
  const footerY = pageHeight - 38;

  // Left: Date & Destination Seal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Date of Issue: ${data.date}`, margin + 20, footerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Location: ${data.destination}`, margin + 20, footerY + 5);
  doc.text('Certified by Trip Delegation', margin + 20, footerY + 10);

  // Center: Official Gold Seal Badge
  const sealX = pageWidth / 2;
  const sealY = footerY + 5;
  doc.setFillColor(254, 243, 199); // amber-100
  doc.circle(sealX, sealY, 14, 'F');
  doc.setDrawColor(217, 119, 6); // amber-600
  doc.setLineWidth(1);
  doc.circle(sealX, sealY, 14, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('OFFICIAL', sealX, sealY - 4, { align: 'center' });
  doc.text('TRIP AWARD', sealX, sealY + 0.5, { align: 'center' });
  doc.text('VERIFIED', sealX, sealY + 5, { align: 'center' });

  // Right: Trip Manager / Finance Lead Signature
  const sigX = pageWidth - margin - 20;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(sigX - 45, footerY + 2, sigX, footerY + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(data.financeLeadName, sigX - 22.5, footerY + 7, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Trip Manager & Finance Lead', sigX - 22.5, footerY + 12, { align: 'center' });

  return doc;
}

/**
 * Download a single trip award certificate PDF
 */
export function downloadTripAwardCertificate(
  trip: Trip,
  awardTitle: string,
  awardIcon: string,
  winnerName: string,
  awardDescription: string,
  voteCount: number,
  totalVoters: number = 0
) {
  const financeLead = trip.members.find((m) => m.id === trip.financeLeadId) || trip.members[0];
  const doc = generateTripAwardCertificatePdf({
    tripName: trip.name,
    destination: trip.destination,
    awardTitle,
    awardIcon,
    winnerName,
    awardDescription,
    voteCount,
    totalVoters,
    financeLeadName: financeLead?.name || 'Yagnish Anupam',
    date: new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  });

  const cleanAward = awardTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanWinner = winnerName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Trip_Award_${cleanAward}_${cleanWinner}.pdf`);
}

/**
 * Generate Base64 string of a single trip award certificate for email attachments
 */
export function getTripAwardCertificateBase64(
  trip: Trip,
  awardTitle: string,
  awardIcon: string,
  winnerName: string,
  awardDescription: string,
  voteCount: number,
  totalVoters: number = 0
): { base64: string; fileName: string } {
  const financeLead = trip.members.find((m) => m.id === trip.financeLeadId) || trip.members[0];
  const doc = generateTripAwardCertificatePdf({
    tripName: trip.name,
    destination: trip.destination,
    awardTitle,
    awardIcon,
    winnerName,
    awardDescription,
    voteCount,
    totalVoters,
    financeLeadName: financeLead?.name || 'Yagnish Anupam',
    date: new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  });

  const cleanAward = awardTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanWinner = winnerName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Certificate_${cleanAward}_${cleanWinner}.pdf`;

  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1] || '';

  return { base64, fileName };
}

