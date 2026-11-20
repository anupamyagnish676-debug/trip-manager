export type Category = 
  | 'stay'
  | 'food'
  | 'travel'
  | 'fuel'
  | 'activities'
  | 'drinks'
  | 'groceries'
  | 'misc';

export interface Member {
  id: string;
  name: string;
  upiId?: string;
  phone?: string;
  avatarColor: string;
  isFinanceLead?: boolean;
}

export type SplitType = 'equal' | 'exact' | 'shares';

export interface ExpenseSplit {
  memberId: string;
  amount: number;
  share?: number; // e.g. 1 share, 2 shares
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  category: Category;
  paidBy: string; // 'POT' or memberId
  paidAt: string; // ISO date
  splitType: SplitType;
  splits: ExpenseSplit[];
  notes?: string;
}

export interface PaymentCapture {
  id: string;
  tripId: string;
  senderName: string;
  amount: number;
  utr?: string;
  timestamp: string;
  rawText?: string;
  matchedMemberId?: string;
  status: 'verified' | 'unassigned' | 'rejected';
  addedToPot: boolean;
}

export interface SettlementTransfer {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  status: 'pending' | 'settled';
  settledAt?: string;
  utr?: string;
}

export interface MemberBalance {
  member: Member;
  totalDirectPaid: number;
  totalDepositedToPot: number;
  totalDirectConsumption: number;
  totalPotConsumption: number;
  netBalance: number; // positive = creditor (receives), negative = debtor (owes)
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  financeLeadId: string; // Member who is the treasurer
  financeLeadCustomQrImage?: string; // Optional uploaded screenshot of actual PhonePe/GPay QR
  members: Member[];
  expenses: Expense[];
  payments: PaymentCapture[];
  settlements: SettlementTransfer[];
}
