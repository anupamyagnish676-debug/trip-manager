export type Category =
  | 'stay'
  | 'food'
  | 'travel'
  | 'fuel'
  | 'activities'
  | 'drinks'
  | 'groceries'
  | 'misc';

export type MemberRole = 'finance_manager' | 'trip_manager' | 'member';

export type TripSpecialty =
  | 'transport'
  | 'stay'
  | 'food'
  | 'activities'
  | 'photos'
  | 'none';

export interface Member {
  id: string;
  name: string;
  loginId: string; // Manually assigned by Trip Manager
  password: string; // Manually assigned by Trip Manager
  role: MemberRole; // finance_manager | trip_manager | member
  email?: string;
  specialty?: TripSpecialty; // Member duty: transport, stay, food, activities, photos
  upiId?: string;
  phone?: string;
  avatarColor: string;
  isFinanceLead?: boolean;
  joinCode?: string;
  pin?: string;
  hasChangedPassword?: boolean;
  driveFolderUrl?: string; // Direct link to member's personal subfolder in Google Drive
}

export type SplitType = 'equal' | 'exact' | 'shares';

export interface ExpenseSplit {
  memberId: string;
  amount: number;
  share?: number;
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
  receiptUrl?: string; // AI scanned receipt
  claimable?: boolean; // Bill self-claim mode
  isPersonal?: boolean; // Personal spend (100% self - does not affect group debt)
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
  collectionRoundId?: string; // which round this belongs to
  paymentMode?: 'upi' | 'cash' | 'bank_transfer' | 'paypal' | 'venmo' | 'other';
  receiptNumber?: string;
  memberEmail?: string;
  notes?: string;
  verifiedBy?: string;
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
  totalPersonalPaid: number;
  netBalance: number;
}

export interface CollectionRound {
  id: string;
  tripId: string;
  title: string;
  targetPerPerson: number;
  dueDate?: string;
  createdAt: string;
  qrNote?: string;
  customQrAmount?: number;
  memberStatus: Record<string, 'paid' | 'pending' | 'partial'>;
}

export interface TripPaymentMethods {
  upiId?: string; // India UPI
  paypalUrl?: string; // PayPal.me link
  venmoHandle?: string; // US Venmo
  bankDetails?: string; // IBAN, Swift, Account number & IFSC / Routing
  note?: string; // Payment instructions
  customQrImage?: string; // Uploaded QR image
  driveUploadWebhookUrl?: string; // Google Apps Script web app URL for automated drive uploads
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  currency?: string; // 'INR', 'USD', 'EUR', 'GBP', etc.
  startDate: string;
  endDate: string;
  financeLeadId: string;
  financeLeadCustomQrImage?: string;
  paymentMethods?: TripPaymentMethods;
  members: Member[];
  expenses: Expense[];
  payments: PaymentCapture[];
  settlements: SettlementTransfer[];
  collectionRounds?: CollectionRound[];
  inviteCode?: string; // e.g. TOKYO26
  driveFolderUrl?: string; // Google Drive shared memories folder URL
  driveUploadWebhookUrl?: string; // Google Apps Script web app URL
  createdAt?: string;
}

export interface AppSession {
  memberId: string;
  tripId: string;
  role: MemberRole;
  isFirstLogin?: boolean;
}
