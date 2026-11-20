'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Receipt, Scale, QrCode, Users, Plus, Sparkles, Share2,
  Trash2, Calendar, MapPin, CheckCircle2, ArrowRight, TrendingDown,
  RotateCcw, Database, Cloud, CloudOff, Settings, LogOut, Shield,
  Briefcase, Bell, ChevronDown, Menu, X, Compass, Edit2,
} from 'lucide-react';
import { Trip, Expense, PaymentCapture, SettlementTransfer, Category, Member, MemberRole, CollectionRound, AppSession } from '@/types';
import { INITIAL_TRIP } from '@/lib/mockData';
import { formatMoney, getCurrencySymbol } from '@/lib/currency';
import { PotCard } from '@/components/PotCard';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { PaymentCaptureModal } from '@/components/PaymentCaptureModal';
import { SettleUpTab } from '@/components/SettleUpTab';
import { QRCodeModal } from '@/components/QRCodeModal';
import { WhatsAppExportModal } from '@/components/WhatsAppExportModal';
import { TripSettingsModal } from '@/components/TripSettingsModal';
import { TripGroupMembersModal } from '@/components/TripGroupMembersModal';
import { CollectionRoundsTab } from '@/components/CollectionRoundsTab';
import { LoginScreen } from '@/components/LoginScreen';
import { MemberView } from '@/components/MemberView';
import { calculatePotSummary, calculateMemberBalances } from '@/lib/calculations';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getSession, saveSession, clearSession, isFinanceManager, isTripManager } from '@/lib/session';
import {
  fetchTripFromSupabase, seedTripToSupabase, insertExpenseToSupabase,
  upsertExpenseToSupabase, deleteExpenseFromSupabase, insertPaymentToSupabase, saveSettlementToSupabase,
  subscribeToTripRealtime, updateTripInSupabase, clearTripExpensesAndPayments,
  upsertCollectionRoundToSupabase,
} from '@/lib/tripService';

const CATEGORY_ICONS: Record<Category, string> = {
  food: '🍽️', stay: '🏨', travel: '🚕', fuel: '⛽',
  activities: '⛷️', drinks: '🍻', groceries: '🛒', misc: '✨',
};

const ROLE_BADGE: Record<MemberRole, { label: string; cls: string; icon: React.ReactNode }> = {
  finance_manager: { label: 'Finance Manager', icon: <Shield className="h-3 w-3" />, cls: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' },
  trip_manager: { label: 'Trip Manager', icon: <Briefcase className="h-3 w-3" />, cls: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800' },
  member: { label: 'Member', icon: <Users className="h-3 w-3" />, cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
};

type TabKey = 'my_view' | 'expenses' | 'settle' | 'collections' | 'qr_capture' | 'members';

export default function TripFinancePortal() {
  const [trip, setTrip] = useState<Trip>(INITIAL_TRIP);
  const [session, setSession] = useState<AppSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('my_view');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLeadQrOpen, setIsLeadQrOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGroupMembersOpen, setIsGroupMembersOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(4000);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [customQrModal, setCustomQrModal] = useState<{
    payeeUpi: string; payeeName: string; amount?: number; note?: string;
  } | null>(null);

  const hasSupabase = isSupabaseConfigured();

  // Derived permission flags
  const currentMember = session ? trip.members.find((m) => m.id === session.memberId) : null;
  const myRole: MemberRole = currentMember?.role || 'member';
  const canManageFinance = isFinanceManager(myRole);
  const canManageTrip = isTripManager(myRole);

  // ── Load session on mount ──
  useEffect(() => {
    const s = getSession();
    setSession(s);
    setSessionChecked(true);
  }, []);

  // After login, everyone starts on My View (roles are additive, not exclusive)
  const handleLoggedIn = () => {
    const s = getSession();
    setSession(s);
    setActiveTab('my_view');
  };

  // ── Load trip data ──
  const loadTripData = useCallback(async (targetTripId?: string) => {
    // Clear out any old mock data from previous sessions
    try { localStorage.removeItem('trip_split_data_v2'); } catch {}

    let reqId = targetTripId;
    if (!reqId && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      reqId = params.get('trip') || undefined;
    }
    if (!reqId && typeof window !== 'undefined') {
      reqId = localStorage.getItem('active_trip_id') || undefined;
    }

    const tripId = reqId || INITIAL_TRIP.id;

    if (hasSupabase) {
      setIsCloudSyncing(true);
      const cloudTrip = await fetchTripFromSupabase(tripId);
      if (cloudTrip) {
        setTrip(cloudTrip);
      } else {
        try {
          const saved = localStorage.getItem(`trip_portal_${tripId}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            setTrip(parsed);
            await seedTripToSupabase(parsed);
          } else if (tripId === INITIAL_TRIP.id) {
            await seedTripToSupabase(INITIAL_TRIP);
            setTrip(INITIAL_TRIP);
          }
        } catch {}
      }
      setIsCloudSyncing(false);
    } else {
      try {
        const saved =
          localStorage.getItem(`trip_portal_${tripId}`) ||
          localStorage.getItem('trip_portal_clean_v1');
        if (saved) setTrip(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }
  }, [hasSupabase]);

  useEffect(() => {
    loadTripData();
    if (hasSupabase && trip.id) {
      const unsubscribe = subscribeToTripRealtime(trip.id, () => loadTripData(trip.id));
      return () => unsubscribe();
    }
  }, [loadTripData, hasSupabase, trip.id]);

  // ── Save trip ──
  const saveTripState = (updated: Trip) => {
    setTrip(updated);
    try {
      localStorage.setItem(`trip_portal_${updated.id}`, JSON.stringify(updated));
      localStorage.setItem('trip_portal_clean_v1', JSON.stringify(updated));
      localStorage.setItem('active_trip_id', updated.id);
    } catch (e) { console.error(e); }
    if (hasSupabase) {
      updateTripInSupabase(updated).catch((err) => console.error('Cloud sync error:', err));
    }
  };

  const financeLead = trip.members.find((m) => m.id === trip.financeLeadId) || trip.members[0] || { id: 'm_lead', name: 'Finance Lead', upiId: '' };
  const potSummary = calculatePotSummary(trip);
  const totalTripSpend = trip.expenses.reduce((sum, e) => sum + e.amount, 0);

  // ── Handlers ──
  const handleAddExpense = async (newExp: Expense) => {
    const updated = { ...trip, expenses: [newExp, ...trip.expenses] };
    saveTripState(updated);
    if (hasSupabase) await insertExpenseToSupabase(newExp);
  };

  const handleUpdateExpense = async (updatedExp: Expense) => {
    const updated = {
      ...trip,
      expenses: trip.expenses.map((e) => (e.id === updatedExp.id ? updatedExp : e)),
    };
    saveTripState(updated);
    if (hasSupabase) await upsertExpenseToSupabase(updatedExp);
    setEditingExpense(null);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!canManageTrip && !canManageFinance) return;
    const updated = { ...trip, expenses: trip.expenses.filter((e) => e.id !== id) };
    saveTripState(updated);
    if (hasSupabase) await deleteExpenseFromSupabase(id);
  };

  const handlePaymentCaptured = async (newPay: PaymentCapture) => {
    let updatedRounds = trip.collectionRounds;
    if (newPay.collectionRoundId && newPay.matchedMemberId && trip.collectionRounds) {
      updatedRounds = trip.collectionRounds.map((r) =>
        r.id === newPay.collectionRoundId
          ? { ...r, memberStatus: { ...r.memberStatus, [newPay.matchedMemberId!]: 'paid' } }
          : r
      );
    }
    const updated = {
      ...trip,
      payments: [newPay, ...trip.payments],
      collectionRounds: updatedRounds,
    };
    saveTripState(updated);
    if (hasSupabase) {
      await insertPaymentToSupabase(newPay);
      if (newPay.collectionRoundId && updatedRounds) {
        const roundToSync = updatedRounds.find((r) => r.id === newPay.collectionRoundId);
        if (roundToSync) await upsertCollectionRoundToSupabase(roundToSync);
      }
    }
  };

  const handleUpdateSettlement = async (updatedSettlements: SettlementTransfer[]) => {
    const updated = { ...trip, settlements: updatedSettlements };
    saveTripState(updated);
    if (hasSupabase) {
      const latest = updatedSettlements[updatedSettlements.length - 1];
      if (latest) await saveSettlementToSupabase(trip.id, latest);
    }
  };

  const handleResetData = async () => {
    if (!canManageFinance) return;
    if (confirm('Clear all trip expenses, payments, and collection rounds to start fresh at 0?')) {
      localStorage.removeItem(`trip_portal_${trip.id}`);
      setTrip(INITIAL_TRIP);
      if (hasSupabase) {
        await clearTripExpensesAndPayments(trip.id);
        await seedTripToSupabase(INITIAL_TRIP);
      }
    }
  };

  const handleSaveTripSettings = async (updatedTrip: Trip) => {
    saveTripState(updatedTrip);
    if (hasSupabase) await updateTripInSupabase(updatedTrip);
  };

  const handleClearAllData = async () => {
    if (!canManageFinance) return;
    if (confirm('Clear all expenses, payments, and collection rounds? Trip will start fresh at 0!')) {
      const freshTrip: Trip = { ...trip, expenses: [], payments: [], settlements: [], collectionRounds: [] };
      saveTripState(freshTrip);
      if (hasSupabase) await clearTripExpensesAndPayments(trip.id);
      setIsSettingsOpen(false);
    }
  };

  const handleAddRound = async (round: CollectionRound) => {
    const updated: Trip = {
      ...trip,
      collectionRounds: [...(trip.collectionRounds || []), round],
    };
    saveTripState(updated);
    if (hasSupabase) {
      await upsertCollectionRoundToSupabase(round);
    }
  };

  const handleUpdateRoundStatus = async (
    roundId: string,
    memberId: string,
    status: 'paid' | 'pending' | 'partial'
  ) => {
    const targetRound = (trip.collectionRounds || []).find((r) => r.id === roundId);
    const targetMember = trip.members.find((m) => m.id === memberId);

    const updatedRounds = (trip.collectionRounds || []).map((r) =>
      r.id === roundId
        ? { ...r, memberStatus: { ...r.memberStatus, [memberId]: status } }
        : r
    );

    let updatedPayments = [...(trip.payments || [])];

    if (status === 'paid' && targetRound && targetMember) {
      const existingPay = updatedPayments.find(
        (p) => p.collectionRoundId === roundId && p.matchedMemberId === memberId
      );
      if (!existingPay) {
        const year = new Date().getFullYear();
        const randNum = Math.floor(1000 + Math.random() * 9000);
        const autoPayment: PaymentCapture = {
          id: `pay-${roundId}-${memberId}`,
          tripId: trip.id,
          senderName: targetMember.name,
          amount: targetRound.targetPerPerson,
          utr: `ROUND-${targetRound.title.slice(0, 4).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
          timestamp: new Date().toISOString(),
          rawText: `Collection payment for "${targetRound.title}" by ${targetMember.name}`,
          matchedMemberId: memberId,
          status: 'verified',
          addedToPot: true,
          collectionRoundId: roundId,
          receiptNumber: `REC-${year}-${randNum}`,
          verifiedBy: financeLead.name,
        };
        updatedPayments = [autoPayment, ...updatedPayments];
        if (hasSupabase) {
          insertPaymentToSupabase(autoPayment).catch((e) => console.error(e));
        }
      }
    } else if (status !== 'paid') {
      updatedPayments = updatedPayments.filter(
        (p) => !(p.collectionRoundId === roundId && p.matchedMemberId === memberId)
      );
    }

    const updated: Trip = {
      ...trip,
      collectionRounds: updatedRounds,
      payments: updatedPayments,
    };

    saveTripState(updated);
    if (hasSupabase) {
      const roundToSync = updatedRounds.find((r) => r.id === roundId);
      if (roundToSync) await upsertCollectionRoundToSupabase(roundToSync);
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setActiveTab('my_view');
  };

  // ── Tab definitions ──
  // User Rule: "NOT ALL MEMBERS CAN SEE OTHERS DETAILS ONLY FINANCE CAN SEE OTHERS DETAILS."
  // - Finance Manager: sees full finances (Collection Manager, Settle Matrix, Inbound Bank Feed, Net Balances) + My Portal
  // - Trip Manager: manages the Trip Group (adding members, assigning Login IDs & Passwords) + My Portal + Trip Bills
  // - General Members: ONLY see My Portal (their own pending dues to Finance & splits) + Trip Bills (split bills for group)
  const allTabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number; financeOnly?: boolean }[] = [
    { key: 'my_view', label: 'My Portal', icon: <Users className="h-4 w-4" /> }, // ALL roles (strictly isolated to personal details)
    { key: 'expenses', label: 'Trip Bills', icon: <Receipt className="h-4 w-4" />, count: trip.expenses.length }, // ALL roles (view & split bills for all)
    { key: 'collections', label: 'Collection Rounds', icon: <Bell className="h-4 w-4 text-amber-500" />, count: (trip.collectionRounds || []).length, financeOnly: true }, // FINANCE MANAGER ONLY
    { key: 'settle', label: 'Group Settlement Matrix', icon: <Scale className="h-4 w-4 text-emerald-500" />, financeOnly: true }, // FINANCE MANAGER ONLY
    { key: 'qr_capture', label: 'QR & Inbound Bank Feed', icon: <QrCode className="h-4 w-4 text-teal-500" />, count: trip.payments.length, financeOnly: true }, // FINANCE MANAGER ONLY
    { key: 'members', label: 'All Friends & Net Balances', icon: <Users className="h-4 w-4" />, count: trip.members.length, financeOnly: true }, // FINANCE MANAGER ONLY
  ];

  const visibleTabs = allTabs.filter((t) => !t.financeOnly || canManageFinance);

  // Security guard: ensure non-finance members are strictly locked to personal tabs
  useEffect(() => {
    if (sessionChecked && !canManageFinance && activeTab !== 'my_view' && activeTab !== 'expenses') {
      setActiveTab('my_view');
    }
  }, [sessionChecked, canManageFinance, activeTab]);

  if (!sessionChecked) return null;

  if (!session) {
    return <LoginScreen trip={trip} onLoggedIn={handleLoggedIn} onUpdateTrip={saveTripState} onSelectTrip={(id) => loadTripData(id)} />;
  }

  const currencySymbol = getCurrencySymbol(trip.currency);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* ── TOP NAVBAR ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md font-black text-lg">
              {currencySymbol}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-extrabold text-slate-900 dark:text-white sm:text-base">{trip.name}</h1>
                {trip.inviteCode && (
                  <button
                    onClick={() => {
                      const appUrl = typeof window !== 'undefined' ? `${window.location.origin}?trip=${trip.id}` : '';
                      navigator.clipboard.writeText(appUrl);
                      alert(`Trip invite link copied:\n${appUrl}`);
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-0.5 text-[9px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                    title="Click to copy trip invite link"
                  >
                    <span>Code:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{trip.inviteCode}</strong>
                    <Share2 className="h-2.5 w-2.5" />
                  </button>
                )}
                {hasSupabase ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <Cloud className="h-2 w-2" /> Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    <CloudOff className="h-2 w-2" /> Local
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5 text-emerald-500" /> {trip.destination} • {trip.members.length} member{trip.members.length === 1 ? '' : 's'} • {trip.currency || 'INR'} ({currencySymbol})
              </p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Export (Trip Managers & Finance Lead only) */}
            {canManageTrip && (
              <button
                onClick={() => setIsExportOpen(true)}
                className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-200"
              >
                <Share2 className="h-3.5 w-3.5" /> WhatsApp
              </button>
            )}

            {/* Inbound Simulator (Finance Lead only) */}
            {canManageFinance && (
              <button
                onClick={() => setIsCaptureOpen(true)}
                className="flex items-center gap-1 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-2.5 py-1.5 text-xs font-bold transition-all"
              >
                <Sparkles className="h-3.5 w-3.5 text-teal-500" />
                <span className="hidden sm:inline">UPI Simulator</span>
              </button>
            )}

            {/* Trip Group & Credentials (Trip Manager & Finance Manager) */}
            {canManageTrip && (
              <button
                type="button"
                onClick={() => setIsGroupMembersOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900 px-2.5 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 transition-all"
                title="Manage Trip Group Members, Roles & Login Credentials"
              >
                <Users className="h-3.5 w-3.5 text-sky-500" />
                <span className="hidden sm:inline">Trip Group</span> ({trip.members.length})
              </button>
            )}

            {/* Add expense (available to all members - all can split bills for the group) */}
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Split Bill</span>
            </button>

            {/* Identity chip */}
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5">
              <div className={`flex h-5 w-5 items-center justify-center rounded-full text-white text-[9px] font-bold ${currentMember?.avatarColor || 'bg-slate-500'}`}>
                {currentMember?.name.slice(0, 2).toUpperCase() || '??'}
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:block max-w-[80px] truncate">
                {currentMember?.name}
              </span>
              <button onClick={handleLogout} title="Switch user" className="text-slate-400 hover:text-rose-500 transition-colors">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Role badge bar */}
        {currentMember && (
          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 px-4 py-1.5 sm:px-6 flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${ROLE_BADGE[myRole].cls}`}>
              {ROLE_BADGE[myRole].icon}
              {ROLE_BADGE[myRole].label}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  clearSession();
                  setSession(null);
                }}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs flex items-center gap-1 transition-colors"
                title="Switch to another trip group or create a new trip"
              >
                <Compass className="h-3.5 w-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Switch Trip</span>
              </button>
              {canManageFinance && (
                <button onClick={() => setIsSettingsOpen(true)}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs flex items-center gap-1 transition-colors">
                  <Settings className="h-3.5 w-3.5" /> Settings
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── MAIN ── */}
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 space-y-5">
        {/* Pot Card — Group Treasury Overview visible on shared group tabs for everyone */}
        {activeTab !== 'my_view' && (
          <PotCard
            trip={trip}
            canManageFinance={canManageFinance}
            onOpenQR={() => setIsLeadQrOpen(true)}
            onOpenCapture={() => setIsCaptureOpen(true)}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          />
        )}

        {/* Tab Bar */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <nav className="flex space-x-1 py-1 flex-1 min-w-0">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`rounded-full px-1.5 text-[10px] font-bold ${
                    activeTab === tab.key
                      ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ── TAB CONTENT ── */}

        {/* MY VIEW */}
        {activeTab === 'my_view' && currentMember && (
          <MemberView
            trip={trip}
            currentMember={currentMember}
            onOpenQR={(payeeUpi, payeeName, amount, note) =>
              setCustomQrModal({ payeeUpi, payeeName, amount, note })
            }
            onPaymentCaptured={handlePaymentCaptured}
            onUpdateRoundStatus={handleUpdateRoundStatus}
            onUpdateSettlement={handleUpdateSettlement}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          />
        )}

        {/* EXPENSES */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Trip Expense Feed</h3>
                <p className="text-xs text-slate-500">
                  Total: <strong>{formatMoney(totalTripSpend, trip.currency)}</strong> across {trip.expenses.length} bills
                </p>
              </div>
              <button onClick={() => { setEditingExpense(null); setIsAddExpenseOpen(true); }}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm transition-all">
                <Plus className="h-3.5 w-3.5" /> Add Expense
              </button>
            </div>

            <div className="space-y-2.5">
              {trip.expenses.map((exp) => {
                const payer = exp.paidBy === 'POT'
                  ? { name: 'Trip Pot', avatarColor: 'bg-emerald-600' }
                  : trip.members.find((m) => m.id === exp.paidBy) || { name: 'Friend', avatarColor: 'bg-slate-600' };
                const myShare = exp.splits.find((s) => s.memberId === currentMember?.id);
                return (
                  <div key={exp.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl dark:bg-slate-800 shadow-inner">
                        {CATEGORY_ICONS[exp.category] || '💸'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{exp.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>Paid by <strong className="text-slate-700 dark:text-slate-300">{payer.name}</strong></span>
                          <span>•</span>
                          <span>{exp.splits.length} people</span>
                          {myShare && (
                            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                              My share: {formatMoney(myShare.amount, trip.currency)}
                            </span>
                          )}
                          {exp.notes && <span className="italic text-slate-400">{exp.notes}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-base font-black text-slate-900 dark:text-white">{formatMoney(exp.amount, trip.currency)}</span>
                        <p className="text-[10px] text-slate-400">{exp.paidAt}</p>
                      </div>
                      {(canManageTrip || canManageFinance) && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingExpense(exp);
                              setIsAddExpenseOpen(true);
                            }}
                            title="Edit Bill (Who Paid, Amount, Splits)"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            title="Delete Bill"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {trip.expenses.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-400">
                  No expenses yet — add the first one!
                </div>
              )}
            </div>
          </div>
        )}

        {/* SETTLE UP */}
        {activeTab === 'settle' && (
          <SettleUpTab trip={trip} onUpdateSettlement={handleUpdateSettlement} />
        )}

        {/* COLLECTION ROUNDS */}
        {activeTab === 'collections' && (
          <CollectionRoundsTab
            trip={trip}
            canManage={canManageTrip}
            currentMember={currentMember || undefined}
            onAddRound={handleAddRound}
            onUpdateRoundStatus={handleUpdateRoundStatus}
            onOpenQR={(payeeUpi, payeeName, amount, note) =>
              setCustomQrModal({ payeeUpi, payeeName, amount, note })
            }
            onPaymentCaptured={handlePaymentCaptured}
          />
        )}

        {/* QR & PAYMENTS (managers only) */}
        {activeTab === 'qr_capture' && canManageTrip && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 mb-2">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Finance Lead QR</h3>
              <p className="text-xs text-slate-500 mt-1">Share with friends to deposit into the Central Pot</p>
              <div className="my-4 flex items-center justify-center gap-2">
                <span className="text-xs text-slate-500">Preset:</span>
                <div className="flex gap-1.5">
                  {[2000, 3000, 4000, 5000].map((amt) => (
                    <button key={amt} onClick={() => setDepositAmount(amt)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                        depositAmount === amt
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                      {currencySymbol}{amt / 1000}k
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setCustomQrModal({ payeeUpi: financeLead.upiId || trip.paymentMethods?.upiId || 'treasury@upi', payeeName: financeLead.name, amount: depositAmount, note: `TripPotDeposit` })}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-bold text-white shadow-md transition-all active:scale-95">
                <QrCode className="h-4 w-4" /> Open QR for {formatMoney(depositAmount, trip.currency)}
              </button>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-left text-xs space-y-1">
                <p className="text-slate-400">Treasurer VPA:</p>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">{financeLead.upiId}</p>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-500" /> Inbound Payment Feed
                  </h3>
                  <p className="text-xs text-slate-500">Live record of bank SMS / push notifications</p>
                </div>
                <button onClick={() => setIsCaptureOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-xs font-bold transition-all">
                  <Plus className="h-3.5 w-3.5" /> Test
                </button>
              </div>
              <div className="space-y-3">
                {trip.payments.map((p) => {
                  const matched = trip.members.find((m) => m.id === p.matchedMemberId);
                  return (
                    <div key={p.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold text-xs ${matched ? matched.avatarColor : 'bg-slate-500'}`}>
                            {matched ? matched.name.slice(0, 2).toUpperCase() : '??'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{matched ? matched.name : p.senderName}</h4>
                              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">Credited to Pot</span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">UTR: {p.utr} • {new Date(p.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">+{formatMoney(p.amount, trip.currency)}</span>
                      </div>
                      {p.rawText && (
                        <div className="mt-2.5 rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200/80 dark:border-slate-700/60">
                          <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate">&quot;{p.rawText}&quot;</p>
                        </div>
                      )}
                    </div>
                  );
                })}
                {trip.payments.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-400">
                    No payments captured yet. Click Test to simulate one.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MEMBERS (managers only) */}
        {activeTab === 'members' && canManageTrip && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Trip Roster ({trip.members.length} Friends)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {trip.members.map((member) => {
                  const role: MemberRole = member.role || 'member';
                  const balances = calculateMemberBalances(trip);
                  const myBal = balances.find((b) => b.member.id === member.id);
                  return (
                    <div key={member.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white font-extrabold text-sm flex-shrink-0 ${member.avatarColor}`}>
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{member.name}</h4>
                          <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${ROLE_BADGE[role].cls}`}>
                            {ROLE_BADGE[role].icon} {ROLE_BADGE[role].label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{member.upiId}</p>
                        {myBal && (
                          <p className={`text-[11px] font-bold mt-0.5 ${myBal.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {myBal.netBalance >= 0 ? '↑' : '↓'} {formatMoney(Math.abs(myBal.netBalance), trip.currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Expense Category Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(
                  trip.expenses.reduce((acc, curr) => {
                    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
                    return acc;
                  }, {} as Record<Category, number>)
                ).map(([cat, amount]) => {
                  const pct = totalTripSpend > 0 ? (amount / totalTripSpend) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="capitalize flex items-center gap-1.5">
                          <span>{CATEGORY_ICONS[cat as Category] || '💸'}</span>
                          <span>{cat}</span>
                        </span>
                        <span className="text-slate-900 dark:text-white">{formatMoney(amount, trip.currency)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        members={trip.members}
        onAddExpense={handleAddExpense}
        onUpdateExpense={handleUpdateExpense}
        expenseToEdit={editingExpense}
        potBalance={potSummary.balance}
        tripId={trip.id}
        currency={trip.currency}
      />

      <PaymentCaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        trip={trip}
        onPaymentCaptured={handlePaymentCaptured}
        financeLeadUpi={financeLead.upiId || trip.paymentMethods?.upiId || 'treasury@upi'}
      />

      <WhatsAppExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        trip={trip}
      />

      <QRCodeModal
        isOpen={isLeadQrOpen}
        onClose={() => setIsLeadQrOpen(false)}
        payeeUpi={financeLead.upiId || trip.paymentMethods?.upiId || 'treasury@upi'}
        payeeName={financeLead.name}
        amount={depositAmount}
        note="TripPotDeposit"
        title="Central Trip Pot Deposit QR"
        customQrImage={trip.financeLeadCustomQrImage}
        onSaveUpi={canManageFinance ? (newUpi) => {
          const updatedMembers = trip.members.map((m) =>
            m.id === financeLead.id ? { ...m, upiId: newUpi } : m
          );
          const updatedTrip: Trip = {
            ...trip,
            paymentMethods: { ...trip.paymentMethods, upiId: newUpi },
            members: updatedMembers,
          };
          saveTripState(updatedTrip);
        } : undefined}
      />

      {canManageFinance && (
        <TripSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          trip={trip}
          onSaveTrip={handleSaveTripSettings}
          onClearAllData={handleClearAllData}
        />
      )}

      {canManageTrip && (
        <TripGroupMembersModal
          isOpen={isGroupMembersOpen}
          onClose={() => setIsGroupMembersOpen(false)}
          trip={trip}
          onSaveMembers={(updatedMembers) => {
            const updated = { ...trip, members: updatedMembers };
            saveTripState(updated);
            if (hasSupabase) {
              updateTripInSupabase(updated);
            }
          }}
        />
      )}

      {customQrModal && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setCustomQrModal(null)}
          payeeUpi={customQrModal.payeeUpi}
          payeeName={customQrModal.payeeName}
          amount={customQrModal.amount}
          note={customQrModal.note}
        />
      )}
    </div>
  );
}
