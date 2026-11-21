'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Receipt, Scale, QrCode, Users, Plus, Sparkles, Share2,
  Trash2, Calendar, MapPin, CheckCircle2, ArrowRight, TrendingDown,
  RotateCcw, Database, Cloud, CloudOff, Settings, LogOut, Shield,
  Briefcase, Bell, ChevronDown, Menu, X, Compass, Edit2, User,
  TrendingUp, FileText, KeyRound, Folder, ExternalLink, Download,
  Mail, Loader2,
} from 'lucide-react';
import { Trip, Expense, PaymentCapture, SettlementTransfer, Category, Member, AppSession } from '@/types';
import { INITIAL_TRIP } from '@/lib/mockData';
import { formatMoney, getCurrencySymbol } from '@/lib/currency';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { SettleUpTab } from '@/components/SettleUpTab';
import { QRCodeModal } from '@/components/QRCodeModal';
import { WhatsAppExportModal } from '@/components/WhatsAppExportModal';
import { TripSettingsModal } from '@/components/TripSettingsModal';
import { TripGroupMembersModal } from '@/components/TripGroupMembersModal';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { LoginScreen } from '@/components/LoginScreen';
import { MemberView } from '@/components/MemberView';
import { calculateMemberBalances } from '@/lib/calculations';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getSession, saveSession, clearSession } from '@/lib/session';
import { downloadExpenseInvoice, downloadOverallTripReport, generateExpenseInvoicePdf } from '@/lib/pdfReceipt';
import {
  fetchTripFromSupabase, seedTripToSupabase, insertExpenseToSupabase,
  upsertExpenseToSupabase, deleteExpenseFromSupabase, insertPaymentToSupabase, saveSettlementToSupabase,
  syncAllSettlementsToSupabase,
  subscribeToTripRealtime, updateTripInSupabase, clearTripExpensesAndPayments,
  fetchLatestTripFromSupabase, deleteTripFromSupabase, wipeAllDatabaseAndStorage,
  findTripByCodeOrId,
} from '@/lib/tripService';

const CATEGORY_ICONS: Record<Category, string> = {
  food: '🍽️', stay: '🏨', travel: '🚕', fuel: '⛽',
  activities: '⛷️', drinks: '🍻', groceries: '🛒', misc: '✨',
};

type TabKey = 'my_view' | 'expenses' | 'settle' | 'members';

export default function TripFinancePortal() {
  const [trip, setTrip] = useState<Trip>(INITIAL_TRIP);
  const [session, setSession] = useState<AppSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('my_view');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGroupMembersOpen, setIsGroupMembersOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [sendingEmailExpenseId, setSendingEmailExpenseId] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [customQrModal, setCustomQrModal] = useState<{
    payeeUpi: string; payeeName: string; amount?: number; note?: string;
  } | null>(null);

  const hasSupabase = isSupabaseConfigured();

  // Active member (every member is equal)
  const currentMember = session ? trip.members.find((m) => m.id === session.memberId) : null;

  // Check if current user is the trip creator / organizer / Trip Manager
  const isTripManager = Boolean(
    currentMember &&
    (currentMember.name.toLowerCase().includes('yagnish') ||
     currentMember.id === trip.financeLeadId ||
     currentMember.isFinanceLead ||
     currentMember.role === 'finance_manager' ||
     currentMember.role === 'trip_manager' ||
     trip.members[0]?.id === currentMember.id)
  );
  const isOrganizer = isTripManager;

  // ── Load session on mount ──
  useEffect(() => {
    const s = getSession();
    setSession(s);
    setSessionChecked(true);
    if (s?.isFirstLogin) {
      setIsChangePasswordOpen(true);
    }
  }, []);

  const handleLoggedIn = () => {
    const s = getSession();
    setSession(s);
    setActiveTab('my_view');
    if (s?.isFirstLogin) {
      setIsChangePasswordOpen(true);
    }
  };

  const handleSaveNewPassword = (newPassword: string) => {
    if (!currentMember) return;
    const cleanPass = newPassword.trim();
    const updatedMembers = trip.members.map((m) =>
      m.id === currentMember.id
        ? { ...m, password: cleanPass, hasChangedPassword: true }
        : m
    );
    const updatedTrip = { ...trip, members: updatedMembers };
    saveTripState(updatedTrip);

    if (session) {
      const updatedSession = { ...session, isFirstLogin: false };
      saveSession(updatedSession);
      setSession(updatedSession);
    }
  };

  // Guarantee Yagnish is designated as the Finance Manager / Lead if present
  const normalizeFinanceLead = (t: Trip): Trip => {
    if (!t.members || t.members.length === 0) return t;
    const yagnish = t.members.find((m) => m.name.toLowerCase().includes('yagnish'));
    const targetLeadId = yagnish ? yagnish.id : (t.financeLeadId || t.members[0]?.id);

    const updatedMembers = t.members.map((m) => {
      const isLead = m.id === targetLeadId;
      return {
        ...m,
        isFinanceLead: isLead,
        role: isLead ? ('finance_manager' as const) : m.role === 'finance_manager' ? ('member' as const) : m.role,
      };
    });

    return {
      ...t,
      financeLeadId: targetLeadId,
      members: updatedMembers,
    };
  };

  // ── Load trip data ──
  const loadTripData = useCallback(async (targetTripId?: string) => {
    try { localStorage.removeItem('trip_split_data_v2'); } catch {}

    let reqId = targetTripId;
    if (!reqId && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      reqId = params.get('trip') || params.get('code') || undefined;
    }
    if (!reqId && typeof window !== 'undefined') {
      reqId = localStorage.getItem('active_trip_id') || undefined;
    }

    if (hasSupabase) {
      setIsCloudSyncing(true);
      let cloudTrip = reqId ? await fetchTripFromSupabase(reqId) : null;
      if (!cloudTrip && reqId) {
        cloudTrip = await findTripByCodeOrId(reqId);
      }
      if (!cloudTrip) {
        // Look for the latest trip in Supabase
        cloudTrip = await fetchLatestTripFromSupabase();
      }

      if (cloudTrip) {
        const normalized = normalizeFinanceLead(cloudTrip);
        setTrip(normalized);
        try {
          localStorage.setItem('active_trip_id', normalized.id);
          localStorage.setItem(`trip_portal_${normalized.id}`, JSON.stringify(normalized));
        } catch {}
      } else {
        // No trips in cloud! Do not re-upload stale deleted trips
        try {
          if (reqId) localStorage.removeItem(`trip_portal_${reqId}`);
          localStorage.removeItem('active_trip_id');
          localStorage.removeItem('trip_portal_clean_v1');
          clearSession();
        } catch {}
        setSession(null);
        setTrip(INITIAL_TRIP);
      }
      setIsCloudSyncing(false);
    } else {
      try {
        const tripId = reqId || INITIAL_TRIP.id;
        const saved =
          localStorage.getItem(`trip_portal_${tripId}`) ||
          localStorage.getItem('trip_portal_clean_v1');
        if (saved) setTrip(normalizeFinanceLead(JSON.parse(saved)));
        else setTrip(normalizeFinanceLead(INITIAL_TRIP));
      } catch (e) { console.error(e); }
    }
    setIsInitialLoading(false);
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
    const normalized = normalizeFinanceLead(updated);
    setTrip(normalized);
    try {
      localStorage.setItem(`trip_portal_${normalized.id}`, JSON.stringify(normalized));
      localStorage.setItem('trip_portal_clean_v1', JSON.stringify(normalized));
      localStorage.setItem('active_trip_id', normalized.id);
    } catch (e) { console.error(e); }
    if (hasSupabase) {
      updateTripInSupabase(normalized).catch((err) => console.error('Cloud sync error:', err));
    }
  };

  const totalTripSpend = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalGroupSpend = trip.expenses.filter((e) => !e.isPersonal).reduce((sum, e) => sum + e.amount, 0);
  const totalPersonalSpend = trip.expenses.filter((e) => e.isPersonal).reduce((sum, e) => sum + e.amount, 0);

  // ── Email Dispatch Helper for Bills (Sent to all members) ──
  const sendBillNotificationEmail = async (exp: Expense, isResend = false): Promise<boolean> => {
    try {
      const paidByName =
        exp.paidBy === 'POT'
          ? 'Trip Pot (Common Pool)'
          : trip.members.find((m) => m.id === exp.paidBy)?.name || 'Trip Member';

      // Collect all configured member emails
      const memberEmails = trip.members
        .map((m) => m.email?.trim())
        .filter((em): em is string => Boolean(em && em.includes('@')));

      const uniqueRecipients = Array.from(new Set(memberEmails));

      const splitsWithNames = (exp.splits || []).map((s) => ({
        name: trip.members.find((m) => m.id === s.memberId)?.name || 'Member',
        amount: s.amount,
      }));

      // Generate the official PDF Invoice & Split Voucher to attach with the email
      let pdfBase64: string | undefined;
      let pdfFileName: string | undefined;
      try {
        const doc = generateExpenseInvoicePdf(trip, exp, currentMember || undefined);
        const dataUri = doc.output('datauristring');
        pdfBase64 = dataUri.includes('base64,') ? dataUri.split('base64,')[1] : dataUri;
        const invoiceNumber = `INV-${(trip.inviteCode || 'TRIP').toUpperCase()}-${exp.id.slice(-6).toUpperCase()}`;
        const cleanTitle = exp.title.replace(/[^a-zA-Z0-9]/g, '_');
        pdfFileName = `${invoiceNumber}_${cleanTitle}.pdf`;
      } catch (pdfErr) {
        console.warn('PDF invoice generation for email attachment error:', pdfErr);
      }

      const res = await fetch('/api/send-bill-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripName: trip.name,
          destination: trip.destination,
          billTitle: exp.title,
          category: exp.category,
          amount: exp.amount,
          currency: trip.currency || 'INR',
          paidByName,
          paidAt: exp.paidAt,
          notes: exp.notes,
          isPersonal: exp.isPersonal,
          recipients: uniqueRecipients,
          splits: splitsWithNames,
          portalUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
          isResend,
          pdfBase64,
          pdfFileName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (isResend) {
          const list = data.sentTo && data.sentTo.length > 0 ? data.sentTo.join(', ') : 'All registered members';
          alert(`✅ Bill email successfully resent to all friends:\n${list}`);
        }
        return true;
      } else if (data.skipped) {
        if (isResend) {
          alert(`⚠️ Notice: ${data.message}`);
        }
        return false;
      } else {
        if (isResend) {
          alert(`❌ Failed to send email: ${data.error || 'Server error'}`);
        }
        return false;
      }
    } catch (e: any) {
      console.warn('Bill email notification caught error:', e);
      if (isResend) {
        alert(`❌ Email dispatch error: ${e?.message || e}`);
      }
      return false;
    }
  };

  const handleResendBillEmail = async (exp: Expense) => {
    if (!isTripManager) {
      alert('Only the designated Trip Manager / Finance Manager can resend bill emails.');
      return;
    }
    setSendingEmailExpenseId(exp.id);
    await sendBillNotificationEmail(exp, true);
    setSendingEmailExpenseId(null);
  };

  // ── Handlers ──
  const handleAddExpense = async (newExp: Expense) => {
    const updated = { ...trip, expenses: [newExp, ...trip.expenses] };
    saveTripState(updated);
    if (hasSupabase) await insertExpenseToSupabase(newExp);

    // Auto-dispatch email notification to all members when ANYONE enters a bill
    sendBillNotificationEmail(newExp, false).catch((err) =>
      console.warn('Auto bill email dispatch error:', err)
    );
  };

  const handleUpdateExpense = async (updatedExp: Expense) => {
    if (!isTripManager) {
      alert('Only the designated Trip Manager can modify expenses.');
      return;
    }
    const updated = {
      ...trip,
      expenses: trip.expenses.map((e) => (e.id === updatedExp.id ? updatedExp : e)),
    };
    saveTripState(updated);
    if (hasSupabase) await upsertExpenseToSupabase(updatedExp);
    setEditingExpense(null);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!isTripManager) {
      alert('Only the designated Trip Manager can delete expenses.');
      return;
    }
    if (confirm('Delete this bill? Settlements and balances will automatically recalculate.')) {
      const updated = { ...trip, expenses: trip.expenses.filter((e) => e.id !== id) };
      saveTripState(updated);
      if (hasSupabase) await deleteExpenseFromSupabase(id);
    }
  };

  const handleUpdateSettlement = async (updatedSettlements: SettlementTransfer[]) => {
    const updated = { ...trip, settlements: updatedSettlements };
    saveTripState(updated);
    if (hasSupabase) {
      await syncAllSettlementsToSupabase(trip.id, updatedSettlements);
    }
  };

  const handleSaveTripSettings = async (updatedTrip: Trip) => {
    saveTripState(updatedTrip);
    if (hasSupabase) await updateTripInSupabase(updatedTrip);
  };

  const handleClearAllData = async () => {
    if (confirm('Clear all bills and settlements to start fresh from 0? Member list will be preserved.')) {
      const freshTrip: Trip = { ...trip, expenses: [], payments: [], settlements: [], collectionRounds: [] };
      saveTripState(freshTrip);
      if (hasSupabase) await clearTripExpensesAndPayments(trip.id);
      setIsSettingsOpen(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (confirm(`Permanently delete "${trip.name}" and all data? You will return to the Create Trip screen.`)) {
      if (hasSupabase) {
        await deleteTripFromSupabase(trip.id);
      }
      try {
        localStorage.removeItem(`trip_portal_${trip.id}`);
        localStorage.removeItem('active_trip_id');
        localStorage.removeItem('trip_portal_clean_v1');
        clearSession();
      } catch {}
      setSession(null);
      setTrip(INITIAL_TRIP);
      setIsSettingsOpen(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setActiveTab('my_view');
  };

  const handleUpdateMemberUpi = (payeeName: string, newUpi: string) => {
    const cleanUpi = newUpi.trim();
    const updatedMembers = trip.members.map((m) =>
      m.name.toLowerCase() === payeeName.toLowerCase() || m.id === payeeName
        ? { ...m, upiId: cleanUpi }
        : m
    );
    const updatedTrip = { ...trip, members: updatedMembers };
    saveTripState(updatedTrip);
    if (customQrModal) {
      setCustomQrModal({ ...customQrModal, payeeUpi: cleanUpi });
    }
  };

  const handleOpenDrive = () => {
    if (trip.driveFolderUrl && trip.driveFolderUrl.trim().length > 0) {
      window.open(trip.driveFolderUrl.trim(), '_blank', 'noopener,noreferrer');
    } else {
      if (isTripManager) {
        setIsSettingsOpen(true);
      } else {
        alert('The Trip Manager has not added a Google Drive shared album link yet.');
      }
    }
  };

  // ── Universal Tabs (Identical for ALL members) ──
  const allTabs: { key: TabKey; label: string; mobileLabel: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'my_view', label: 'Overview', mobileLabel: 'Overview', icon: <User className="h-4 w-4" /> },
    { key: 'expenses', label: 'Trip Bills', mobileLabel: 'Bills', icon: <Receipt className="h-4 w-4" />, count: trip.expenses.length },
    { key: 'settle', label: 'Settle Up', mobileLabel: 'Settle Up', icon: <Scale className="h-4 w-4 text-emerald-500" /> },
    { key: 'members', label: 'Friends', mobileLabel: 'Friends', icon: <Users className="h-4 w-4" />, count: trip.members.length },
  ];

  if (!sessionChecked || isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mb-3 shadow-lg" />
        <p className="text-xs text-slate-400 font-medium tracking-wide">Loading trip portal...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        trip={trip}
        onLoggedIn={handleLoggedIn}
        onUpdateTrip={saveTripState}
        onSelectTrip={(id) => loadTripData(id)}
      />
    );
  }

  const currencySymbol = getCurrencySymbol(trip.currency);
  const balances = calculateMemberBalances(trip);

  return (
    <div className="min-h-screen ambient-glow-bg text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans">
      {/* ── TOP NAVBAR ── */}
      <header className="sticky top-0 z-30 glass-panel border-b border-slate-200/70 dark:border-slate-800/70 shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
          {/* Brand & Trip Info */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 text-white shadow-md shadow-emerald-500/20 font-black text-base sm:text-lg flex-shrink-0 ring-1 ring-emerald-500/30">
              {currencySymbol}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[140px] sm:max-w-none">
                  {trip.name}
                </h1>
                {trip.inviteCode && (
                  <button
                    onClick={() => {
                      const appUrl = typeof window !== 'undefined' ? `${window.location.origin}?trip=${trip.id}` : '';
                      navigator.clipboard.writeText(appUrl || trip.inviteCode!);
                      alert(`Trip invite link copied:\n${appUrl || trip.inviteCode}`);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 px-2.5 py-0.5 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-all shadow-2xs hover:scale-102 flex-shrink-0"
                    title="Click to copy trip invite link"
                  >
                    <span className="text-slate-400 font-normal">Code:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{trip.inviteCode}</strong>
                    <Share2 className="h-2.5 w-2.5 text-slate-400" />
                  </button>
                )}
                {hasSupabase ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <Cloud className="h-2.5 w-2.5" /> Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-extrabold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <CloudOff className="h-2.5 w-2.5" /> Offline
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate font-medium">
                <MapPin className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                <span className="truncate">{trip.destination} • {trip.members.length} friends • Currency: {trip.currency || 'INR'} ({currencySymbol})</span>
              </p>
            </div>
          </div>

          {/* Right Action Bar: Ultra-clean & Professional */}
          <div className="flex items-center gap-2 relative flex-shrink-0">
            {/* User Identity & Menu Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 rounded-2xl glass-card hover:border-slate-300 dark:hover:border-slate-600 p-1 sm:p-1.5 sm:pr-2.5 transition-all touch-manipulation shadow-2xs"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-white text-xs font-black shadow-xs flex-shrink-0 ${currentMember?.avatarColor || 'bg-slate-500'}`}>
                  {currentMember?.name.slice(0, 2).toUpperCase() || '??'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[110px]">
                    {currentMember?.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    @{currentMember?.loginId || 'member'}
                  </p>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Modern User Dropdown Menu */}
              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {currentMember?.name}
                      </p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono truncate">
                        {currentMember?.upiId ? `UPI: ${currentMember.upiId}` : 'No UPI ID set'}
                      </p>
                    </div>

                    <div className="py-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsExportOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                      >
                        <Share2 className="h-4 w-4 text-emerald-500" />
                        <span>WhatsApp Summary</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsGroupMembersOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                      >
                        <Users className="h-4 w-4 text-sky-500" />
                        <span>Friends & Sign-Ins</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsChangePasswordOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                      >
                        <KeyRound className="h-4 w-4 text-amber-500" />
                        <span>Change Password</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsSettingsOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                      >
                        <Settings className="h-4 w-4 text-slate-400" />
                        <span>Trip Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleOpenDrive();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-xl transition-colors text-left"
                      >
                        <Folder className="h-4 w-4 text-sky-500" />
                        <span>📸 Drive Memories</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Switch User / Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Integrated Desktop & Tablet Navigation Bar */}
        <div className="hidden sm:block border-t border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
            <nav className="flex space-x-1.5 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300/40 dark:border-slate-700/40">
              {allTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold transition-all whitespace-nowrap active:scale-98 ${
                      isActive
                        ? 'bg-white text-slate-950 dark:bg-slate-950 dark:text-white shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'
                    }`}
                  >
                    <span className={isActive ? 'text-emerald-500' : 'text-slate-400'}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-300/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="hidden md:flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-2xs">
                <span>💎 Total Spend:</span>
                <strong className="font-black text-slate-900 dark:text-white">{formatMoney(totalTripSpend, trip.currency)}</strong>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6 pb-28 sm:pb-8">
        {/* ── TAB 1: MY OVERVIEW & DUES ── */}
        {activeTab === 'my_view' && currentMember && (
          <MemberView
            trip={trip}
            currentMember={currentMember}
            onOpenQR={(payeeUpi, payeeName, amount, note) =>
              setCustomQrModal({ payeeUpi, payeeName, amount, note })
            }
            onUpdateSettlement={handleUpdateSettlement}
            onUpdateMemberUpi={(newUpi) => handleUpdateMemberUpi(currentMember.id, newUpi)}
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            onOpenAddExpense={() => {
              setEditingExpense(null);
              setIsAddExpenseOpen(true);
            }}
          />
        )}

        {/* ── TAB 2: TRIP BILLS & EXPENSE FEED ── */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Trip Expense Feed</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Total spend: <strong className="text-slate-900 dark:text-white">{formatMoney(totalTripSpend, trip.currency)}</strong>
                  {totalPersonalSpend > 0 && (
                    <span className="text-[11px] text-slate-400 ml-1">
                      (Group: {formatMoney(totalGroupSpend, trip.currency)} • Personal: {formatMoney(totalPersonalSpend, trip.currency)})
                    </span>
                  )} across {trip.expenses.length} bills
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {trip.expenses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => downloadOverallTripReport(trip)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 px-3.5 py-2 text-xs font-bold shadow-sm transition-all active:scale-95 touch-manipulation min-h-[36px]"
                    title="Download consolidated PDF statement of overall trip expenses and bills"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Download Overall Bills</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setEditingExpense(null);
                    setIsAddExpenseOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition-all active:scale-95 touch-manipulation min-h-[36px]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Bill
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {trip.expenses.map((exp) => {
                const isPersonal = Boolean(exp.isPersonal);
                const payer = trip.members.find((m) => m.id === exp.paidBy) || { name: 'Friend', avatarColor: 'bg-slate-600' };
                const myShare = exp.splits.find((s) => s.memberId === currentMember?.id);
                const isMyPayment = exp.paidBy === currentMember?.id;

                return (
                  <div
                    key={exp.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl dark:bg-slate-800 shadow-inner flex-shrink-0">
                        {CATEGORY_ICONS[exp.category] || '💸'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{exp.title}</h4>
                          {isPersonal && (
                            <span className="rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 text-[10px] font-bold">
                              👤 Personal Expense
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                          <span>
                            Paid by <strong className={isMyPayment ? (isPersonal ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold') : 'text-slate-700 dark:text-slate-300'}>{isMyPayment ? 'You' : payer.name}</strong>
                          </span>
                          <span>•</span>
                          {isPersonal ? (
                            <span className="text-purple-600 dark:text-purple-400 font-medium">100% private solo spend</span>
                          ) : (
                            <>
                              <span>{exp.splits.length} friends splitting</span>
                              {myShare && (
                                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                                  Your share: {formatMoney(myShare.amount, trip.currency)}
                                </span>
                              )}
                            </>
                          )}
                          {exp.notes && <span className="italic text-slate-400">({exp.notes})</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-end gap-2.5 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between sm:justify-start sm:text-right">
                        <span className="sm:hidden text-xs text-slate-400">{exp.paidAt}</span>
                        <div className="text-right">
                          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                            {formatMoney(exp.amount, trip.currency)}
                          </span>
                          <p className="hidden sm:block text-[10px] text-slate-400">{exp.paidAt}</p>
                        </div>
                      </div>

                      {/* Actions: Download PDF Invoice Slip, Edit and Delete */}
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => downloadExpenseInvoice(trip, exp, currentMember || undefined)}
                          title="Download Official PDF Invoice Slip"
                          className="flex items-center gap-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1.5 text-xs font-bold transition-all shadow-sm active:scale-95 touch-manipulation min-h-[34px]"
                        >
                          <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Invoice Slip</span>
                        </button>

                        {isTripManager && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleResendBillEmail(exp)}
                              disabled={sendingEmailExpenseId === exp.id}
                              title="Resend Bill Email Notification to All Friends (Manager / FM only)"
                              className="flex items-center gap-1 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 px-2.5 py-1.5 text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 touch-manipulation min-h-[34px]"
                            >
                              {sendingEmailExpenseId === exp.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600 dark:text-sky-400 shrink-0" />
                              ) : (
                                <Mail className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                              )}
                              <span>{sendingEmailExpenseId === exp.id ? 'Sending...' : 'Resend Email'}</span>
                            </button>

                            <button
                              onClick={() => {
                                setEditingExpense(exp);
                                setIsAddExpenseOpen(true);
                              }}
                              title="Edit Bill (Trip Manager only)"
                              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all touch-manipulation min-h-[34px] min-w-[34px] flex items-center justify-center"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              title="Delete Bill (Trip Manager only)"
                              className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-all touch-manipulation min-h-[34px] min-w-[34px] flex items-center justify-center"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {trip.expenses.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900">
                  <div className="text-4xl mb-3">🧾</div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300">No trip expenses logged yet</h4>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Add your meals, stays, taxis, train tickets, and fuel!</p>
                  <button
                    onClick={() => {
                      setEditingExpense(null);
                      setIsAddExpenseOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-md transition-all"
                  >
                    <Plus className="h-4 w-4" /> Add First Bill
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: GROUP SETTLEMENT MATRIX ── */}
        {activeTab === 'settle' && (
          <SettleUpTab
            trip={trip}
            currentMember={currentMember}
            onUpdateSettlement={handleUpdateSettlement}
            onUpdateMemberUpi={handleUpdateMemberUpi}
          />
        )}

        {/* ── TAB 4: GROUP FRIENDS & BALANCES ── */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Trip Friends ({trip.members.length} Members)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isOrganizer
                    ? 'Full group roster & net balances (Organizer Access)'
                    : 'Trip friend list & receiving payment methods'}
                </p>
              </div>
              {isOrganizer && (
                <button
                  onClick={() => setIsGroupMembersOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3.5 py-2 text-xs font-bold shadow-sm hover:opacity-90 transition-all touch-manipulation min-h-[36px]"
                >
                  <Users className="h-3.5 w-3.5" /> + Manage Friends & UPI
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {trip.members.map((member) => {
                const bal = balances.find((b) => b.member.id === member.id);
                const net = bal?.netBalance || 0;
                const isMe = member.id === currentMember?.id;
                const canSeeFinancials = isOrganizer || isMe;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm bg-white dark:bg-slate-900 ${
                      isMe
                        ? 'border-emerald-500/50 dark:border-emerald-500/40 ring-1 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white font-black text-sm flex-shrink-0 shadow-sm ${member.avatarColor}`}>
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {member.name}
                          </h4>
                          {isMe && (
                            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold px-1.5 py-0.2">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className={`text-[11px] font-mono truncate ${member.upiId ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                            {member.upiId || 'No UPI ID'}
                          </p>
                          {(isOrganizer || isMe) && (
                            <button
                              type="button"
                              onClick={() => setIsGroupMembersOpen(true)}
                              className="text-[10px] text-sky-500 hover:text-sky-400 font-semibold underline"
                            >
                              {member.upiId ? (isMe ? 'Edit My UPI' : 'Edit') : (isMe ? 'Set My UPI' : 'Set UPI')}
                            </button>
                          )}
                        </div>
                        {canSeeFinancials && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Paid: {formatMoney(bal?.totalDirectPaid || 0, trip.currency)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {canSeeFinancials ? (
                        <>
                          <p className={`text-xs font-black ${
                            net > 0 ? 'text-emerald-600 dark:text-emerald-400' : net < 0 ? 'text-rose-500' : 'text-slate-400'
                          }`}>
                            {net > 0 ? `+${formatMoney(net, trip.currency)}` : net < 0 ? `-${formatMoney(Math.abs(net), trip.currency)}` : 'Settled'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {net > 0 ? 'is owed' : net < 0 ? 'owes' : 'balanced'}
                          </p>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                          Friend
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Category Spend Breakdown */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Trip Category Breakdown</h3>
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
                        <span className="text-slate-900 dark:text-white">
                          {formatMoney(amount, trip.currency)} ({pct.toFixed(0)}%)
                        </span>
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

      {/* ── MODALS ── */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        members={trip.members}
        currentMember={currentMember}
        onAddExpense={handleAddExpense}
        onUpdateExpense={handleUpdateExpense}
        expenseToEdit={editingExpense}
        tripId={trip.id}
        currency={trip.currency}
      />

      <WhatsAppExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        trip={trip}
      />

      {customQrModal && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setCustomQrModal(null)}
          payeeUpi={customQrModal.payeeUpi}
          payeeName={customQrModal.payeeName}
          amount={customQrModal.amount || 0}
          note={customQrModal.note || 'TripSettlement'}
          title={`Pay ${customQrModal.payeeName}`}
          onSaveUpi={(newUpi) => handleUpdateMemberUpi(customQrModal.payeeName, newUpi)}
        />
      )}

      <TripSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        trip={trip}
        onSaveTrip={handleSaveTripSettings}
        onClearAllData={handleClearAllData}
        onDeleteTrip={handleDeleteTrip}
      />

      <TripGroupMembersModal
        isOpen={isGroupMembersOpen}
        onClose={() => setIsGroupMembersOpen(false)}
        trip={trip}
        currentMember={currentMember}
        onSaveMembers={(updatedMembers) => {
          const lead =
            updatedMembers.find((m) => m.isFinanceLead) ||
            updatedMembers.find((m) => m.role === 'finance_manager') ||
            updatedMembers.find((m) => m.name.toLowerCase().includes('yagnish')) ||
            updatedMembers[0];
          const updated = {
            ...trip,
            financeLeadId: lead?.id || trip.financeLeadId,
            members: updatedMembers,
          };
          saveTripState(updated);
        }}
      />

      {currentMember && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => {
            setIsChangePasswordOpen(false);
            if (session?.isFirstLogin) {
              const updatedSession = { ...session, isFirstLogin: false };
              saveSession(updatedSession);
              setSession(updatedSession);
            }
          }}
          currentMember={currentMember}
          isFirstLogin={Boolean(session?.isFirstLogin && !currentMember.hasChangedPassword)}
          onSavePassword={handleSaveNewPassword}
        />
      )}

      {/* ── MOBILE BOTTOM NAVIGATION BAR ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-xl px-2 py-1.5 flex justify-around items-center shadow-2xl pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        {allTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all relative touch-manipulation ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-emerald-500/10 dark:bg-emerald-400/10' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-[10px] font-semibold mt-0.5 tracking-tight truncate max-w-[68px]">
                {tab.mobileLabel}
              </span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="absolute top-1 right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-emerald-600 text-[9px] font-black text-white flex items-center justify-center shadow-sm">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── FLOATING ACTION BUTTON FOR ADD BILL ── */}
      <button
        type="button"
        onClick={() => {
          setEditingExpense(null);
          setIsAddExpenseOpen(true);
        }}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-30 flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-extrabold shadow-2xl hover:shadow-emerald-600/40 transition-all hover:scale-105 active:scale-95 border border-emerald-400/40 touch-manipulation"
        title="Add a new trip bill"
      >
        <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
        <span>Add Bill</span>
      </button>
    </div>
  );
}
