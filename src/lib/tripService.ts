import { supabase, isSupabaseConfigured } from './supabase';
import { Trip, Expense, PaymentCapture, SettlementTransfer, Member } from '@/types';
import { INITIAL_TRIP } from './mockData';

export async function fetchTripFromSupabase(tripId: string): Promise<Trip | null> {
  if (!supabase || !isSupabaseConfigured()) {
    return null;
  }

  try {
    // 1. Fetch Trip
    const { data: tripData, error: tripErr } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripErr || !tripData) {
      console.warn('Trip not found in Supabase:', tripErr);
      return null;
    }

    // 2. Fetch Members
    const { data: membersData } = await supabase
      .from('members')
      .select('*')
      .eq('trip_id', tripId);

    // 3. Fetch Expenses
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    // 4. Fetch Payments
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    // 5. Fetch Settlements
    const { data: settlementsData } = await supabase
      .from('settlements')
      .select('*')
      .eq('trip_id', tripId);

    const members: Member[] = (membersData || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      upiId: m.upi_id,
      phone: m.phone,
      avatarColor: m.avatar_color,
      isFinanceLead: m.is_finance_lead,
    }));

    const expenses: Expense[] = (expensesData || []).map((e: any) => ({
      id: e.id,
      tripId: e.trip_id,
      title: e.title,
      amount: parseFloat(e.amount),
      category: e.category,
      paidBy: e.paid_by,
      paidAt: e.paid_at,
      splitType: e.split_type,
      splits: e.splits || [],
      notes: e.notes,
    }));

    const payments: PaymentCapture[] = (paymentsData || []).map((p: any) => ({
      id: p.id,
      tripId: p.trip_id,
      senderName: p.sender_name,
      amount: parseFloat(p.amount),
      utr: p.utr,
      timestamp: p.timestamp,
      rawText: p.raw_text,
      matchedMemberId: p.matched_member_id,
      status: p.status,
      addedToPot: p.added_to_pot,
    }));

    const settlements: SettlementTransfer[] = (settlementsData || []).map((s: any) => ({
      fromMemberId: s.from_member_id,
      toMemberId: s.to_member_id,
      amount: parseFloat(s.amount),
      status: s.status,
      settledAt: s.settled_at,
      utr: s.utr,
    }));

    return {
      id: tripData.id,
      name: tripData.name,
      destination: tripData.destination,
      startDate: tripData.start_date,
      endDate: tripData.end_date,
      financeLeadId: tripData.finance_lead_id,
      members,
      expenses,
      payments,
      settlements,
    };
  } catch (err) {
    console.error('Error fetching from Supabase:', err);
    return null;
  }
}

/**
 * Seeds initial trip and all members to Supabase if it doesn't exist yet
 */
export async function seedTripToSupabase(trip: Trip): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;

  try {
    // 1. Insert Trip
    await supabase.from('trips').upsert({
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      start_date: trip.startDate,
      end_date: trip.endDate,
      finance_lead_id: trip.financeLeadId,
    });

    // 2. Insert Members
    const membersPayload = trip.members.map((m) => ({
      id: m.id,
      trip_id: trip.id,
      name: m.name,
      upi_id: m.upiId,
      phone: m.phone,
      avatar_color: m.avatarColor,
      is_finance_lead: m.isFinanceLead || false,
    }));
    await supabase.from('members').upsert(membersPayload);

    // 3. Insert Initial Expenses
    if (trip.expenses.length > 0) {
      const expensesPayload = trip.expenses.map((e) => ({
        id: e.id,
        trip_id: trip.id,
        title: e.title,
        amount: e.amount,
        category: e.category,
        paid_by: e.paidBy,
        paid_at: e.paidAt,
        split_type: e.splitType,
        splits: e.splits,
        notes: e.notes,
      }));
      await supabase.from('expenses').upsert(expensesPayload);
    }

    // 4. Insert Initial Payments
    if (trip.payments.length > 0) {
      const paymentsPayload = trip.payments.map((p) => ({
        id: p.id,
        trip_id: trip.id,
        sender_name: p.senderName,
        amount: p.amount,
        utr: p.utr,
        timestamp: p.timestamp,
        raw_text: p.rawText,
        matched_member_id: p.matchedMemberId,
        status: p.status,
        added_to_pot: p.addedToPot,
      }));
      await supabase.from('payments').upsert(paymentsPayload);
    }

    return true;
  } catch (err) {
    console.error('Failed to seed Supabase trip:', err);
    return false;
  }
}

/**
 * Creates an expense directly in Supabase
 */
export async function insertExpenseToSupabase(expense: Expense): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;

  const { error } = await supabase.from('expenses').insert({
    id: expense.id,
    trip_id: expense.tripId,
    title: expense.title,
    amount: expense.amount,
    category: expense.category,
    paid_by: expense.paidBy,
    paid_at: expense.paidAt,
    split_type: expense.splitType,
    splits: expense.splits,
    notes: expense.notes,
  });

  if (error) {
    console.error('Error inserting expense:', error);
    return false;
  }
  return true;
}

/**
 * Deletes an expense from Supabase
 */
export async function deleteExpenseFromSupabase(id: string): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  return !error;
}

/**
 * Inserts a captured payment into Supabase
 */
export async function insertPaymentToSupabase(payment: PaymentCapture): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;

  const { error } = await supabase.from('payments').insert({
    id: payment.id,
    trip_id: payment.tripId,
    sender_name: payment.senderName,
    amount: payment.amount,
    utr: payment.utr,
    timestamp: payment.timestamp,
    raw_text: payment.rawText,
    matched_member_id: payment.matchedMemberId,
    status: payment.status,
    added_to_pot: payment.addedToPot,
  });

  return !error;
}

/**
 * Saves settled transfers to Supabase
 */
export async function saveSettlementToSupabase(
  tripId: string,
  settlement: SettlementTransfer
): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;

  const { error } = await supabase.from('settlements').insert({
    id: `set-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    trip_id: tripId,
    from_member_id: settlement.fromMemberId,
    to_member_id: settlement.toMemberId,
    amount: settlement.amount,
    status: settlement.status,
    settled_at: settlement.settledAt,
    utr: settlement.utr,
  });

  return !error;
}

/**
 * Subscribes to real-time changes across expenses, payments, and settlements
 */
export function subscribeToTripRealtime(tripId: string, onUpdate: () => void) {
  if (!supabase || !isSupabaseConfigured()) {
    return () => {};
  }

  const client = supabase;
  const channel = client
    .channel(`trip-changes-${tripId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', filter: `trip_id=eq.${tripId}` },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
