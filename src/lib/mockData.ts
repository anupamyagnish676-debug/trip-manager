import { Trip } from '@/types';

const AVATAR_COLORS = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-600',
  'bg-emerald-600', 'bg-teal-600', 'bg-cyan-600', 'bg-sky-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500',
];

export const INITIAL_TRIP: Trip = {
  id: 'trip_manali_2026',
  name: 'Manali Adventure 2026',
  destination: 'Manali, HP',
  startDate: '2026-12-20',
  endDate: '2026-12-26',
  financeLeadId: 'member_anupam',
  inviteCode: 'MANALI26',
  createdAt: new Date().toISOString(),
  members: [
    { id: 'member_anupam', name: 'Anupam', upiId: 'anupam@okaxis', phone: '9876543210', avatarColor: AVATAR_COLORS[4], isFinanceLead: true, role: 'finance_manager', pin: '1234' },
    { id: 'member_sneha', name: 'Sneha', upiId: 'sneha@paytm', phone: '9876543211', avatarColor: AVATAR_COLORS[0], role: 'trip_manager', pin: '4321' },
    { id: 'member_amit', name: 'Amit', upiId: 'amit@ybl', phone: '9876543212', avatarColor: AVATAR_COLORS[1], role: 'member', pin: '3212' },
    { id: 'member_rohan', name: 'Rohan', upiId: 'rohan@okhdfc', phone: '9876543213', avatarColor: AVATAR_COLORS[7], role: 'member', pin: '3213' },
    { id: 'member_priya', name: 'Priya', upiId: 'priya@icici', phone: '9876543214', avatarColor: AVATAR_COLORS[11], role: 'member', pin: '3214' },
    { id: 'member_vikram', name: 'Vikram', upiId: 'vikram@axl', phone: '9876543215', avatarColor: AVATAR_COLORS[2], role: 'member', pin: '3215' },
    { id: 'member_divya', name: 'Divya', upiId: 'divya@paytm', phone: '9876543216', avatarColor: AVATAR_COLORS[9], role: 'member', pin: '3216' },
    { id: 'member_raj', name: 'Raj', upiId: 'raj@ybl', phone: '9876543217', avatarColor: AVATAR_COLORS[6], role: 'member', pin: '3217' },
    { id: 'member_meera', name: 'Meera', upiId: 'meera@sbi', phone: '9876543218', avatarColor: AVATAR_COLORS[3], role: 'member', pin: '3218' },
    { id: 'member_karan', name: 'Karan', upiId: 'karan@okicici', phone: '9876543219', avatarColor: AVATAR_COLORS[5], role: 'member', pin: '3219' },
  ],
  expenses: [
    {
      id: 'exp_1', tripId: 'trip_manali_2026',
      title: 'Hotel Snow Peak – 3 Nights (₹2,400/night)', amount: 7200,
      category: 'stay', paidBy: 'POT', paidAt: '2026-12-20',
      splitType: 'equal',
      splits: [
        { memberId: 'member_anupam', amount: 720 }, { memberId: 'member_sneha', amount: 720 },
        { memberId: 'member_amit', amount: 720 }, { memberId: 'member_rohan', amount: 720 },
        { memberId: 'member_priya', amount: 720 }, { memberId: 'member_vikram', amount: 720 },
        { memberId: 'member_divya', amount: 720 }, { memberId: 'member_raj', amount: 720 },
        { memberId: 'member_meera', amount: 720 }, { memberId: 'member_karan', amount: 720 },
      ],
    },
    {
      id: 'exp_2', tripId: 'trip_manali_2026',
      title: 'Dinner at Himalayan Dhaba', amount: 3200, category: 'food',
      paidBy: 'member_anupam', paidAt: '2026-12-21', splitType: 'exact',
      notes: 'Anupam paid, unequal split',
      splits: [
        { memberId: 'member_anupam', amount: 400 }, { memberId: 'member_sneha', amount: 250 },
        { memberId: 'member_amit', amount: 350 }, { memberId: 'member_rohan', amount: 500 },
        { memberId: 'member_priya', amount: 300 }, { memberId: 'member_vikram', amount: 400 },
        { memberId: 'member_divya', amount: 250 }, { memberId: 'member_raj', amount: 350 },
        { memberId: 'member_meera', amount: 200 }, { memberId: 'member_karan', amount: 200 },
      ],
    },
    {
      id: 'exp_3', tripId: 'trip_manali_2026',
      title: 'Volvo Bus Tickets Delhi ↔ Manali', amount: 14000, category: 'travel',
      paidBy: 'POT', paidAt: '2026-12-19', splitType: 'equal',
      splits: [
        { memberId: 'member_anupam', amount: 1400 }, { memberId: 'member_sneha', amount: 1400 },
        { memberId: 'member_amit', amount: 1400 }, { memberId: 'member_rohan', amount: 1400 },
        { memberId: 'member_priya', amount: 1400 }, { memberId: 'member_vikram', amount: 1400 },
        { memberId: 'member_divya', amount: 1400 }, { memberId: 'member_raj', amount: 1400 },
        { memberId: 'member_meera', amount: 1400 }, { memberId: 'member_karan', amount: 1400 },
      ],
    },
    {
      id: 'exp_4', tripId: 'trip_manali_2026',
      title: 'Rohtang Pass Adventure & Snowmobiles', amount: 4500, category: 'activities',
      paidBy: 'member_sneha', paidAt: '2026-12-22', splitType: 'equal',
      splits: [
        { memberId: 'member_anupam', amount: 450 }, { memberId: 'member_sneha', amount: 450 },
        { memberId: 'member_amit', amount: 450 }, { memberId: 'member_rohan', amount: 450 },
        { memberId: 'member_priya', amount: 450 }, { memberId: 'member_vikram', amount: 450 },
        { memberId: 'member_divya', amount: 450 }, { memberId: 'member_raj', amount: 450 },
        { memberId: 'member_meera', amount: 450 }, { memberId: 'member_karan', amount: 450 },
      ],
    },
    {
      id: 'exp_5', tripId: 'trip_manali_2026',
      title: 'Fuel + Local Taxi Rentals', amount: 3600, category: 'fuel',
      paidBy: 'POT', paidAt: '2026-12-22', splitType: 'equal',
      splits: [
        { memberId: 'member_anupam', amount: 360 }, { memberId: 'member_sneha', amount: 360 },
        { memberId: 'member_amit', amount: 360 }, { memberId: 'member_rohan', amount: 360 },
        { memberId: 'member_priya', amount: 360 }, { memberId: 'member_vikram', amount: 360 },
        { memberId: 'member_divya', amount: 360 }, { memberId: 'member_raj', amount: 360 },
        { memberId: 'member_meera', amount: 360 }, { memberId: 'member_karan', amount: 360 },
      ],
    },
  ],
  payments: [
    { id: 'pay_1', tripId: 'trip_manali_2026', senderName: 'Sneha', amount: 4000, utr: '425012345678', timestamp: '2026-11-01T09:00:00Z', matchedMemberId: 'member_sneha', status: 'verified', addedToPot: true },
    { id: 'pay_2', tripId: 'trip_manali_2026', senderName: 'Amit', amount: 4000, utr: '425023456789', timestamp: '2026-11-02T10:30:00Z', matchedMemberId: 'member_amit', status: 'verified', addedToPot: true },
    { id: 'pay_3', tripId: 'trip_manali_2026', senderName: 'Rohan', amount: 4000, utr: '425034567890', timestamp: '2026-11-02T14:00:00Z', matchedMemberId: 'member_rohan', status: 'verified', addedToPot: true },
    { id: 'pay_4', tripId: 'trip_manali_2026', senderName: 'Priya', amount: 3000, utr: '425045678901', timestamp: '2026-11-03T11:00:00Z', matchedMemberId: 'member_priya', status: 'verified', addedToPot: true },
    { id: 'pay_5', tripId: 'trip_manali_2026', senderName: 'Vikram', amount: 4000, utr: '425056789012', timestamp: '2026-11-04T08:00:00Z', matchedMemberId: 'member_vikram', status: 'verified', addedToPot: true },
  ],
  settlements: [],
  collectionRounds: [
    {
      id: 'round_1', tripId: 'trip_manali_2026',
      title: 'Round 1: Hotel Advance',
      targetPerPerson: 3000,
      dueDate: '2026-11-10',
      createdAt: '2026-10-20T10:00:00Z',
      memberStatus: {
        member_anupam: 'paid', member_sneha: 'paid', member_amit: 'paid',
        member_rohan: 'paid', member_priya: 'partial', member_vikram: 'paid',
        member_divya: 'pending', member_raj: 'pending', member_meera: 'pending', member_karan: 'pending',
      },
    },
    {
      id: 'round_2', tripId: 'trip_manali_2026',
      title: 'Round 2: Bus Tickets',
      targetPerPerson: 1500,
      dueDate: '2026-11-30',
      createdAt: '2026-11-01T10:00:00Z',
      memberStatus: {
        member_anupam: 'paid', member_sneha: 'paid', member_amit: 'pending',
        member_rohan: 'pending', member_priya: 'pending', member_vikram: 'paid',
        member_divya: 'pending', member_raj: 'pending', member_meera: 'pending', member_karan: 'pending',
      },
    },
  ],
};
