import { Trip, Member, MemberBalance, SettlementTransfer } from '@/types';
import { formatMoney } from '@/lib/currency';

/**
 * Calculates net balance for every member in the trip.
 *
 * Rules:
 * - A member's positive contribution:
 *    a) Direct expenses they paid out of pocket for the group.
 *    b) Deposits they sent to the Central Pot (via QR / UPI).
 * - A member's consumption:
 *    a) Their calculated split in direct expenses.
 *    b) Their calculated split in Pot-funded expenses.
 *
 * Net Balance = (Direct Paid + Pot Deposits) - (Total Consumption)
 * Net > 0: Member is a Creditor (they spent more than consumed; should receive money).
 * Net < 0: Member is a Debtor (they consumed more than spent; must pay money).
 * Net == 0: Member is fully settled.
 */
export function calculateMemberBalances(trip: Trip): MemberBalance[] {
  const balanceMap = new Map<string, {
    directPaid: number;
    depositedToPot: number;
    directConsumption: number;
    potConsumption: number;
  }>();

  // Initialize for all members
  trip.members.forEach((m) => {
    balanceMap.set(m.id, {
      directPaid: 0,
      depositedToPot: 0,
      directConsumption: 0,
      potConsumption: 0,
    });
  });

  // 1. Process Pot deposits from verified payments
  trip.payments.forEach((payment) => {
    if (payment.status === 'verified' && payment.matchedMemberId && payment.addedToPot) {
      const current = balanceMap.get(payment.matchedMemberId);
      if (current) {
        current.depositedToPot += payment.amount;
      }
    }
  });

  // Also reconcile collection rounds marked as 'paid' by Finance Manager
  (trip.collectionRounds || []).forEach((round) => {
    Object.entries(round.memberStatus || {}).forEach(([memberId, status]) => {
      if (status === 'paid') {
        const alreadyCountedInPayments = trip.payments.some(
          (p) =>
            p.collectionRoundId === round.id &&
            p.matchedMemberId === memberId &&
            p.status === 'verified' &&
            p.addedToPot
        );
        if (!alreadyCountedInPayments) {
          const current = balanceMap.get(memberId);
          if (current) {
            current.depositedToPot += round.targetPerPerson;
          }
        }
      }
    });
  });

  // 2. Process Expenses
  trip.expenses.forEach((expense) => {
    const isFromPot = expense.paidBy === 'POT';

    if (!isFromPot) {
      // Direct payment by an individual member
      const payerStats = balanceMap.get(expense.paidBy);
      if (payerStats) {
        payerStats.directPaid += expense.amount;
      }
    }

    // Split consumption across members
    expense.splits.forEach((split) => {
      const consumerStats = balanceMap.get(split.memberId);
      if (consumerStats) {
        if (isFromPot) {
          consumerStats.potConsumption += split.amount;
        } else {
          consumerStats.directConsumption += split.amount;
        }
      }
    });
  });

  // 3. Process any settlements already marked as settled
  trip.settlements.forEach((settlement) => {
    if (settlement.status === 'settled') {
      const fromStats = balanceMap.get(settlement.fromMemberId);
      const toStats = balanceMap.get(settlement.toMemberId);
      if (fromStats) {
        // Payer sent money, so their debt decreases (net balance increases)
        fromStats.directPaid += settlement.amount;
      }
      if (toStats) {
        // Receiver got money, so their credit decreases (net balance decreases)
        toStats.directConsumption += settlement.amount;
      }
    }
  });

  // Build result list
  return trip.members.map((member) => {
    const stats = balanceMap.get(member.id) || {
      directPaid: 0,
      depositedToPot: 0,
      directConsumption: 0,
      potConsumption: 0,
    };

    const totalContributed = stats.directPaid + stats.depositedToPot;
    const totalConsumed = stats.directConsumption + stats.potConsumption;
    const netBalance = Math.round((totalContributed - totalConsumed) * 100) / 100;

    return {
      member,
      totalDirectPaid: stats.directPaid,
      totalDepositedToPot: stats.depositedToPot,
      totalDirectConsumption: stats.directConsumption,
      totalPotConsumption: stats.potConsumption,
      netBalance,
    };
  });
}

/**
 * Calculates current Pot status:
 * - totalDeposited: sum of all verified payments into Pot
 * - totalSpent: sum of all expenses paid from Pot
 * - balance: deposited - spent
 */
export function calculatePotSummary(trip: Trip) {
  const verifiedPayments = (trip.payments || []).filter(
    (p) => p.status === 'verified' && p.addedToPot
  );

  const directDeposits = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);

  // Reconcile collection rounds marked as 'paid' that are not yet standalone payment objects
  let unrecordedRoundDeposits = 0;
  (trip.collectionRounds || []).forEach((round) => {
    Object.entries(round.memberStatus || {}).forEach(([memberId, status]) => {
      if (status === 'paid') {
        const alreadyCountedInPayments = verifiedPayments.some(
          (p) => p.collectionRoundId === round.id && p.matchedMemberId === memberId
        );
        if (!alreadyCountedInPayments) {
          unrecordedRoundDeposits += round.targetPerPerson;
        }
      }
    });
  });

  const totalDeposited = directDeposits + unrecordedRoundDeposits;

  const totalSpent = (trip.expenses || [])
    .filter((e) => e.paidBy === 'POT')
    .reduce((sum, e) => sum + e.amount, 0);

  const balance = totalDeposited - totalSpent;

  return {
    totalDeposited,
    totalSpent,
    balance,
  };
}

/**
 * Greedy Minimum Cash Flow Algorithm:
 * Takes net balances of 10+ members and calculates the minimum number of
 * direct transfers needed to settle all debts completely.
 */
export function simplifyDebts(balances: MemberBalance[]): SettlementTransfer[] {
  // Separate into debtors (< 0) and creditors (> 0)
  const debtors: { memberId: string; amount: number }[] = [];
  const creditors: { memberId: string; amount: number }[] = [];

  balances.forEach((b) => {
    // Avoid tiny floating point dust (< 1 rupee)
    if (b.netBalance < -0.99) {
      debtors.push({ memberId: b.member.id, amount: Math.abs(b.netBalance) });
    } else if (b.netBalance > 0.99) {
      creditors.push({ memberId: b.member.id, amount: b.netBalance });
    }
  });

  // Sort descending by amount to minimize transfers
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: SettlementTransfer[] = [];

  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // Transfer amount is the minimum of what debtor owes and creditor needs
    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0.01) {
      transfers.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount: Math.round(transferAmount),
        status: 'pending',
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount < 0.01) {
      i++;
    }
    if (creditor.amount < 0.01) {
      j++;
    }
  }

  return transfers;
}

/**
 * Constructs a standard NPCI UPI Deep Link URI.
 * Format: upi://pay?pa=...&pn=...&am=...&tn=...&cu=INR
 */
export function generateUpiUrl(params: {
  upiId: string;
  payeeName: string;
  amount?: number;
  note?: string;
}): string {
  const url = new URL('upi://pay');
  url.searchParams.set('pa', params.upiId.trim());
  url.searchParams.set('pn', params.payeeName.trim());
  url.searchParams.set('cu', 'INR');
  if (params.amount && params.amount > 0) {
    url.searchParams.set('am', params.amount.toFixed(2));
  }
  if (params.note) {
    url.searchParams.set('tn', params.note.trim());
  }
  return url.toString();
}

/**
 * Parses Bank / UPI SMS and push notifications to extract:
 * 1. Amount credited
 * 2. Sender name / UPI ID
 * 3. 12-digit UPI UTR reference number
 * 4. Matches with the corresponding trip friend
 */
export function parseSmsPayment(
  smsText: string,
  members: Member[]
): {
  amount?: number;
  senderName?: string;
  utr?: string;
  matchedMemberId?: string;
  rawText: string;
} {
  const clean = smsText.replace(/\n/g, ' ').trim();
  let amount: number | undefined;
  let senderName: string | undefined;
  let utr: string | undefined;

  // 1. Amount extraction regex patterns
  // Matches: "Rs. 1,500.00", "Rs 1500", "INR 2500", "credited by Rs. 5000", "received Rs 2000"
  const amountPatterns = [
    /(?:credited\s+by|received|credited|cr|paid|transferred)\s*(?:by|of)?\s*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:credited|received)/i,
    /(?:amount\s*of\s*)?(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const regex of amountPatterns) {
    const match = clean.match(regex);
    if (match && match[1]) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  // 2. 12-digit UPI UTR / Reference extraction
  const utrPatterns = [
    /(?:UPI\s*(?:Ref|Reference|Txn|Id|no)?|UTR|Ref\s*no\.?)\s*[:#\s-]*([0-9]{12})/i,
    /(?:Ref\s*(?:no\.?)?\s*[:#\s-]*)([0-9]{12})/i,
  ];

  for (const regex of utrPatterns) {
    const match = clean.match(regex);
    if (match && match[1]) {
      utr = match[1];
      break;
    }
  }

  // 3. Sender extraction regex patterns
  // Matches: "from Rohan Kumar", "by Rohan Sharma UPI", "from VPA rohan@okaxis"
  const senderPatterns = [
    /(?:from|by)\s+([A-Za-z\s]{3,30})(?:\s+(?:UPI|Ref|A\/C|linked|via|on|at|VPA|\.))/i,
    /(?:from|by)\s+([A-Za-z0-9._-]+@[a-zA-Z]+)/i, // UPI ID like user@okhdfcbank
    /(?:from|by)\s+([A-Za-z\s]{3,25})$/i,
  ];

  for (const regex of senderPatterns) {
    const match = clean.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Ignore common non-name words
      if (!/^(your|account|bank|upi|atm|imps|neft|branch)$/i.test(candidate)) {
        senderName = candidate;
        break;
      }
    }
  }

  // 4. Match extracted name or SMS text with Trip Members
  let matchedMemberId: string | undefined;

  // First priority: check if any member's name appears anywhere in the SMS
  for (const member of members) {
    const firstName = member.name.split(' ')[0].toLowerCase();
    const fullName = member.name.toLowerCase();
    const smsLower = clean.toLowerCase();

    if (firstName.length >= 3 && smsLower.includes(firstName)) {
      matchedMemberId = member.id;
      if (!senderName) {
        senderName = member.name;
      }
      break;
    }

    if (member.upiId && smsLower.includes(member.upiId.toLowerCase())) {
      matchedMemberId = member.id;
      break;
    }

    if (member.phone && smsLower.includes(member.phone)) {
      matchedMemberId = member.id;
      break;
    }
  }

  return {
    amount,
    senderName: senderName || 'Unknown Sender',
    utr,
    matchedMemberId,
    rawText: smsText,
  };
}

/**
 * Generates formatted text for WhatsApp group export
 */
export function generateWhatsAppSummary(trip: Trip): string {
  const pot = calculatePotSummary(trip);
  const balances = calculateMemberBalances(trip);
  const settlements = simplifyDebts(balances);

  let text = `✈️ *${trip.name.toUpperCase()}* ✈️\n`;
  text += `📍 *Destination:* ${trip.destination}\n`;
  text += `📅 *Dates:* ${trip.startDate} to ${trip.endDate}\n`;
  text += `👥 *Members:* ${trip.members.length}\n\n`;

  text += `💰 *CENTRAL TREASURY SUMMARY:*\n`;
  text += `• Total Collected: ${formatMoney(pot.totalDeposited, trip.currency)}\n`;
  text += `• Total Spent from Treasury: ${formatMoney(pot.totalSpent, trip.currency)}\n`;
  text += `• Remaining Treasury Balance: ${formatMoney(pot.balance, trip.currency)}\n\n`;

  const totalTripSpend = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  text += `🧾 *TOTAL TRIP EXPENSES:* ${formatMoney(totalTripSpend, trip.currency)}\n\n`;

  text += `⚖️ *FINAL SETTLEMENT (Who Pays Whom):*\n`;
  if (settlements.length === 0) {
    text += `✅ All members are 100% settled! No dues remaining.\n`;
  } else {
    settlements.forEach((s, idx) => {
      const from = trip.members.find((m) => m.id === s.fromMemberId)?.name || 'Unknown';
      const to = trip.members.find((m) => m.id === s.toMemberId)?.name || 'Unknown';
      text += `${idx + 1}. *${from}* ➡️ pays *${formatMoney(s.amount, trip.currency)}* to *${to}*\n`;
    });
  }

  text += `\n✨ _Generated by TripPortal - Group Travel Finances_`;
  return text;
}
