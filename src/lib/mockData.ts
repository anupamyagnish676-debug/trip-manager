import { Trip } from '@/types';

export const INITIAL_TRIP: Trip = {
  id: 'trip_group_portal',
  name: 'Our Trip Group',
  destination: 'Goa',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
  financeLeadId: 'member_anupam',
  inviteCode: 'TRIP2026',
  createdAt: new Date().toISOString(),
  members: [
    {
      id: 'member_anupam',
      name: 'Anupam',
      loginId: 'anupam',
      password: 'password123',
      role: 'finance_manager',
      isFinanceLead: true,
      upiId: '',
      phone: '',
      avatarColor: 'bg-emerald-600',
      specialty: 'none',
      pin: '1234',
    },
  ],
  expenses: [],
  payments: [],
  settlements: [],
  collectionRounds: [],
};
