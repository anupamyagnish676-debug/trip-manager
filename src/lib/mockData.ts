import { Trip } from '@/types';

export function createNewTripTemplate(params?: {
  id?: string;
  name?: string;
  destination?: string;
  currency?: string;
  managerName?: string;
  managerLoginId?: string;
  managerPassword?: string;
  managerUpi?: string;
  paymentMethods?: {
    upiId?: string;
    paypalUrl?: string;
    venmoHandle?: string;
    bankDetails?: string;
    note?: string;
    customQrImage?: string;
  };
}): Trip {
  const managerId = `m_${Date.now()}`;
  const cleanName = (params?.name || 'Our Group Trip').trim();
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const code = (cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'TRIP') + Math.floor(10 + Math.random() * 90);

  const members = params?.managerName
    ? [
        {
          id: managerId,
          name: params.managerName.trim(),
          loginId: (params.managerLoginId || params.managerName.toLowerCase().replace(/\s+/g, '')).trim(),
          password: (params.managerPassword || 'password123').trim(),
          role: 'finance_manager' as const,
          isFinanceLead: true,
          upiId: params.managerUpi || params.paymentMethods?.upiId || '',
          phone: '',
          avatarColor: 'bg-emerald-600',
          specialty: 'none' as const,
          pin: '1234',
        },
      ]
    : [];

  return {
    id: params?.id || `trip_${slug || 'group'}_${Date.now()}`,
    name: cleanName,
    destination: (params?.destination || 'Destination').trim(),
    currency: params?.currency || 'INR',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    financeLeadId: managerId,
    inviteCode: code,
    paymentMethods: params?.paymentMethods || (params?.managerUpi ? { upiId: params.managerUpi } : undefined),
    createdAt: new Date().toISOString(),
    members,
    expenses: [],
    payments: [],
    settlements: [],
    collectionRounds: [],
  };
}

export const INITIAL_TRIP: Trip = createNewTripTemplate({
  id: 'trip_global_portal',
  name: 'Our Group Trip',
  destination: 'Explore the World',
  currency: 'INR',
});
