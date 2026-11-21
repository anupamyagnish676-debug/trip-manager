import { supabase, isSupabaseConfigured } from './supabase';
import { Trip, Expense, PaymentCapture, SettlementTransfer, Member, CollectionRound } from '@/types';
import { INITIAL_TRIP } from './mockData';

export async function fetchTripFromSupabase(tripId: string): Promise<Trip | null> {
  if (!supabase || !isSupabaseConfigured()) return null;

  try {
    const { data: tripData, error: tripErr } = await supabase
      .from('trips').select('*').eq('id', tripId).single();
    if (tripErr || !tripData) { console.warn('Trip not found in Supabase:', tripErr); return null; }

    const { data: membersData } = await supabase.from('members').select('*').eq('trip_id', tripId);
    const { data: expensesData } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
    const { data: paymentsData } = await supabase.from('payments').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
    const { data: settlementsData } = await supabase.from('settlements').select('*').eq('trip_id', tripId);
    const { data: roundsData } = await supabase.from('collection_rounds').select('*').eq('trip_id', tripId).order('created_at', { ascending: true });

    const members: Member[] = (membersData || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      loginId: m.login_id || m.loginId || m.name.toLowerCase().replace(/\s+/g, ''),
      password: m.password || `${m.name.toLowerCase()}123`,
      role: m.role || 'member',
      specialty: m.specialty || 'none',
      upiId: m.upi_id,
      phone: m.phone,
      avatarColor: m.avatar_color,
      isFinanceLead: m.is_finance_lead,
      email: m.email || undefined,
      pin: m.pin,
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
      receiptUrl: e.receipt_url,
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
      collectionRoundId: p.collection_round_id,
    }));

    const settlements: SettlementTransfer[] = (settlementsData || []).map((s: any) => ({
      fromMemberId: s.from_member_id,
      toMemberId: s.to_member_id,
      amount: parseFloat(s.amount),
      status: s.status,
      settledAt: s.settled_at,
      utr: s.utr,
    }));

    const collectionRounds: CollectionRound[] = (roundsData || []).map((r: any) => ({
      id: r.id,
      tripId: r.trip_id,
      title: r.title,
      targetPerPerson: parseFloat(r.target_per_person),
      dueDate: r.due_date,
      createdAt: r.created_at,
      memberStatus: r.member_status || {},
    }));

    return {
      id: tripData.id,
      name: tripData.name,
      destination: tripData.destination,
      currency: tripData.currency || 'INR',
      startDate: tripData.start_date,
      endDate: tripData.end_date,
      financeLeadId: tripData.finance_lead_id,
      financeLeadCustomQrImage: tripData.finance_lead_custom_qr_image,
      paymentMethods: tripData.payment_methods || (tripData.finance_lead_custom_qr_image ? { customQrImage: tripData.finance_lead_custom_qr_image } : undefined),
      inviteCode: tripData.invite_code,
      driveFolderUrl: tripData.drive_folder_url || (tripData.payment_methods as any)?.driveFolderUrl || undefined,
      driveUploadWebhookUrl: tripData.drive_upload_webhook_url || (tripData.payment_methods as any)?.driveUploadWebhookUrl || undefined,
      members,
      expenses,
      payments,
      settlements,
      collectionRounds,
    };
  } catch (err) {
    console.error('Error fetching from Supabase:', err);
    return null;
  }
}

export async function findTripByCodeOrId(identifier: string): Promise<Trip | null> {
  if (!supabase || !isSupabaseConfigured()) return null;
  try {
    const trimmed = identifier.trim();
    // 1. Try by exact ID
    const { data: byId } = await supabase.from('trips').select('id').eq('id', trimmed).single();
    if (byId?.id) {
      return await fetchTripFromSupabase(byId.id);
    }
    // 2. Try by invite code (case-insensitive)
    const { data: byCode } = await supabase.from('trips').select('id').ilike('invite_code', trimmed).single();
    if (byCode?.id) {
      return await fetchTripFromSupabase(byCode.id);
    }
    return null;
  } catch (err) {
    console.error('findTripByCodeOrId error:', err);
    return null;
  }
}

export async function seedTripToSupabase(trip: Trip): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;

  try {
    const paymentMethodsPayload = {
      ...(trip.paymentMethods || {}),
      ...(trip.driveFolderUrl ? { driveFolderUrl: trip.driveFolderUrl } : {}),
      ...(trip.driveUploadWebhookUrl ? { driveUploadWebhookUrl: trip.driveUploadWebhookUrl } : {}),
    };

    await supabase.from('trips').upsert({
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      currency: trip.currency || 'INR',
      start_date: trip.startDate,
      end_date: trip.endDate,
      finance_lead_id: trip.financeLeadId,
      finance_lead_custom_qr_image: trip.financeLeadCustomQrImage || null,
      payment_methods: Object.keys(paymentMethodsPayload).length > 0 ? paymentMethodsPayload : null,
      invite_code: trip.inviteCode || null,
    });

    const membersPayload = trip.members.map((m) => ({
      id: m.id,
      trip_id: trip.id,
      name: m.name,
      login_id: m.loginId,
      password: m.password,
      specialty: m.specialty || 'none',
      upi_id: m.upiId,
      phone: m.phone,
      avatar_color: m.avatarColor,
      is_finance_lead: m.isFinanceLead || false,
      email: m.email || null,
      role: m.role || 'member',
    }));
    await supabase.from('members').upsert(membersPayload);

    if (trip.expenses.length > 0) {
      await supabase.from('expenses').upsert(trip.expenses.map((e) => ({
        id: e.id, trip_id: trip.id, title: e.title, amount: e.amount,
        category: e.category, paid_by: e.paidBy, paid_at: e.paidAt,
        split_type: e.splitType, splits: e.splits, notes: e.notes,
      })));
    }

    if (trip.payments.length > 0) {
      await supabase.from('payments').upsert(trip.payments.map((p) => ({
        id: p.id, trip_id: trip.id, sender_name: p.senderName, amount: p.amount,
        utr: p.utr, timestamp: p.timestamp, raw_text: p.rawText,
        matched_member_id: p.matchedMemberId, status: p.status, added_to_pot: p.addedToPot,
      })));
    }

    if ((trip.collectionRounds || []).length > 0) {
      await supabase.from('collection_rounds').upsert((trip.collectionRounds || []).map((r) => ({
        id: r.id, trip_id: trip.id, title: r.title,
        target_per_person: r.targetPerPerson, due_date: r.dueDate || null,
        member_status: r.memberStatus, created_at: r.createdAt,
      })));
    }

    return true;
  } catch (err) {
    console.error('Failed to seed Supabase trip:', err);
    return false;
  }
}

export async function updateTripInSupabase(trip: Trip): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;

  try {
    const paymentMethodsPayload = {
      ...(trip.paymentMethods || {}),
      ...(trip.driveFolderUrl ? { driveFolderUrl: trip.driveFolderUrl } : {}),
      ...(trip.driveUploadWebhookUrl ? { driveUploadWebhookUrl: trip.driveUploadWebhookUrl } : {}),
    };

    await supabase.from('trips').upsert({
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      currency: trip.currency || 'INR',
      start_date: trip.startDate,
      end_date: trip.endDate,
      finance_lead_id: trip.financeLeadId,
      finance_lead_custom_qr_image: trip.financeLeadCustomQrImage || null,
      payment_methods: Object.keys(paymentMethodsPayload).length > 0 ? paymentMethodsPayload : null,
      invite_code: trip.inviteCode || null,
    });

    await supabase.from('members').upsert(trip.members.map((m) => ({
      id: m.id, trip_id: trip.id, name: m.name, upi_id: m.upiId,
      login_id: m.loginId, password: m.password, specialty: m.specialty || 'none',
      email: m.email || null, phone: m.phone, avatar_color: m.avatarColor,
      is_finance_lead: m.isFinanceLead || false, role: m.role || 'member',
    })));

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function clearTripExpensesAndPayments(tripId: string): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;
  try {
    await supabase.from('expenses').delete().eq('trip_id', tripId);
    await supabase.from('payments').delete().eq('trip_id', tripId);
    await supabase.from('settlements').delete().eq('trip_id', tripId);
    return true;
  } catch (e) { console.error(e); return false; }
}

export async function insertExpenseToSupabase(expense: Expense): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;
  const { error } = await supabase.from('expenses').insert({
    id: expense.id, trip_id: expense.tripId, title: expense.title,
    amount: expense.amount, category: expense.category, paid_by: expense.paidBy,
    paid_at: expense.paidAt, split_type: expense.splitType, splits: expense.splits, notes: expense.notes,
  });
  return !error;
}

export async function upsertExpenseToSupabase(expense: Expense): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;
  const { error } = await supabase.from('expenses').upsert({
    id: expense.id, trip_id: expense.tripId, title: expense.title,
    amount: expense.amount, category: expense.category, paid_by: expense.paidBy,
    paid_at: expense.paidAt, split_type: expense.splitType, splits: expense.splits, notes: expense.notes,
  });
  return !error;
}

export async function deleteExpenseFromSupabase(id: string): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  return !error;
}

export async function insertPaymentToSupabase(payment: PaymentCapture): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;
  const { error } = await supabase.from('payments').insert({
    id: payment.id, trip_id: payment.tripId, sender_name: payment.senderName,
    amount: payment.amount, utr: payment.utr, timestamp: payment.timestamp,
    raw_text: payment.rawText, matched_member_id: payment.matchedMemberId,
    status: payment.status, added_to_pot: payment.addedToPot,
    collection_round_id: payment.collectionRoundId || null,
  });
  return !error;
}

export async function saveSettlementToSupabase(tripId: string, settlement: SettlementTransfer): Promise<boolean> {
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

export async function syncAllSettlementsToSupabase(tripId: string, settlements: SettlementTransfer[]): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;
  try {
    await supabase.from('settlements').delete().eq('trip_id', tripId);
    if (settlements.length > 0) {
      const rows = settlements.map((s, idx) => ({
        id: `set-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        trip_id: tripId,
        from_member_id: s.fromMemberId,
        to_member_id: s.toMemberId,
        amount: s.amount,
        status: s.status,
        settled_at: s.settledAt || new Date().toISOString(),
        utr: s.utr || null,
      }));
      await supabase.from('settlements').insert(rows);
    }
    return true;
  } catch (e) {
    console.error('Failed to sync settlements:', e);
    return false;
  }
}

export async function upsertCollectionRoundToSupabase(round: CollectionRound): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;
  const { error } = await supabase.from('collection_rounds').upsert({
    id: round.id, trip_id: round.tripId, title: round.title,
    target_per_person: round.targetPerPerson, due_date: round.dueDate || null,
    member_status: round.memberStatus, created_at: round.createdAt,
  });
  return !error;
}

export async function fetchLatestTripFromSupabase(): Promise<Trip | null> {
  if (!supabase || !isSupabaseConfigured()) return null;
  try {
    const { data: latest } = await supabase
      .from('trips')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest?.id) {
      return await fetchTripFromSupabase(latest.id);
    }
    return null;
  } catch (err) {
    console.error('fetchLatestTripFromSupabase error:', err);
    return null;
  }
}

export async function deleteTripFromSupabase(tripId: string): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;
  try {
    await supabase.from('settlements').delete().eq('trip_id', tripId);
    await supabase.from('payments').delete().eq('trip_id', tripId);
    await supabase.from('expenses').delete().eq('trip_id', tripId);
    await supabase.from('collection_rounds').delete().eq('trip_id', tripId);
    await supabase.from('members').delete().eq('trip_id', tripId);
    await supabase.from('trips').delete().eq('id', tripId);
    return true;
  } catch (e) {
    console.error('deleteTripFromSupabase error:', e);
    return false;
  }
}

export async function wipeAllDatabaseAndStorage(): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured()) return false;
  try {
    await supabase.from('settlements').delete().neq('id', '___none___');
    await supabase.from('payments').delete().neq('id', '___none___');
    await supabase.from('expenses').delete().neq('id', '___none___');
    await supabase.from('collection_rounds').delete().neq('id', '___none___');
    await supabase.from('members').delete().neq('id', '___none___');
    await supabase.from('trips').delete().neq('id', '___none___');
    return true;
  } catch (e) {
    console.error('wipeAllDatabaseAndStorage error:', e);
    return false;
  }
}

export function subscribeToTripRealtime(tripId: string, onUpdate: () => void) {
  if (!supabase || !isSupabaseConfigured()) return () => {};

  const client = supabase;
  const channel = client
    .channel(`trip-changes-${tripId}`)
    .on('postgres_changes', { event: '*', schema: 'public', filter: `trip_id=eq.${tripId}` }, () => { onUpdate(); })
    .subscribe();

  return () => { client.removeChannel(channel); };
}
