'use client';

import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  QrCode,
  CheckCircle2,
  Smartphone,
  Plus,
  Receipt,
  Share2,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Edit3,
  KeyRound,
  Folder,
  ExternalLink,
  Check,
  Clock,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Member, Trip, SettlementTransfer } from '@/types';
import { calculateMemberBalances, simplifyDebts, generateUpiUrl } from '@/lib/calculations';
import { formatMoney } from '@/lib/currency';
import { downloadExpenseInvoice, downloadMemberStatement } from '@/lib/pdfReceipt';

interface MemberViewProps {
  trip: Trip;
  currentMember: Member;
  onOpenQR?: (payeeUpi: string, payeeName: string, amount: number, note: string) => void;
  onUpdateSettlement?: (settlements: SettlementTransfer[]) => void;
  onOpenAddExpense?: () => void;
  onUpdateMemberUpi?: (newUpi: string) => void;
  onOpenChangePassword?: () => void;
  onOpenUploadMemories?: () => void;
}

export function MemberView({
  trip,
  currentMember,
  onOpenQR,
  onUpdateSettlement,
  onOpenAddExpense,
  onUpdateMemberUpi,
  onOpenChangePassword,
  onOpenUploadMemories,
}: MemberViewProps) {
  const [showHistory, setShowHistory] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'group' | 'personal'>('all');
  const [isEditingMyUpi, setIsEditingMyUpi] = useState(false);
  const [myUpiInput, setMyUpiInput] = useState(currentMember.upiId || '');
  const [savedUpiSuccess, setSavedUpiSuccess] = useState(false);

  const balances = calculateMemberBalances(trip);
  const myBalance = balances.find((b) => b.member.id === currentMember.id);
  const settlements = simplifyDebts(balances);

  const iOweTo = settlements.filter(
    (s) => s.fromMemberId === currentMember.id && s.status !== 'settled'
  );
  const owesMe = settlements.filter(
    (s) => s.toMemberId === currentMember.id && s.status !== 'settled'
  );
  const settledToMe = trip.settlements.filter(
    (s) => s.toMemberId === currentMember.id && s.status === 'settled'
  );

  const getMember = (id: string) => trip.members.find((m) => m.id === id);

  // All expenses that involve the user:
  // - Either the user is in splits (group bill or personal bill for them)
  // - OR the user paid for a shared group bill
  const myExpenses = trip.expenses.filter((e) =>
    e.splits.some((s) => s.memberId === currentMember.id) || (!e.isPersonal && e.paidBy === currentMember.id)
  );

  // Group share consumed (only from shared group bills)
  const groupShareConsumed = trip.expenses
    .filter((e) => !e.isPersonal)
    .reduce((sum, e) => {
      const mySplit = e.splits.find((s) => s.memberId === currentMember.id);
      return sum + (mySplit?.amount || 0);
    }, 0);

  // Personal spend (100% solo purchases for this member)
  const personalSpend = trip.expenses
    .filter((e) => e.isPersonal && (e.splits[0]?.memberId === currentMember.id || e.paidBy === currentMember.id))
    .reduce((sum, e) => sum + e.amount, 0);

  // Grand Total Out-of-Pocket: Group Share + Personal Spend
  const grandTotalCost = groupShareConsumed + personalSpend;

  // Total fronted by user (both group bills fronted and personal bills paid)
  const totalIPaid = trip.expenses
    .filter((e) => e.paidBy === currentMember.id)
    .reduce((sum, e) => sum + e.amount, 0);

  // Filtered expenses for the breakdown list
  const filteredExpenses = myExpenses.filter((e) => {
    if (filterType === 'group') return !e.isPersonal;
    if (filterType === 'personal') return Boolean(e.isPersonal);
    return true;
  });

  const net = myBalance?.netBalance || 0;

  const handleMarkSettlementPaid = (transfer: SettlementTransfer) => {
    // Only the entitled receiver can confirm payment
    if (currentMember.id !== transfer.toMemberId) {
      alert(`Only ${getMember(transfer.toMemberId)?.name || 'the recipient'} can confirm receipt of this payment.`);
      return;
    }

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    const existing = [...trip.settlements];
    existing.push({
      ...transfer,
      status: 'settled',
      settledAt: new Date().toISOString(),
    });

    if (onUpdateSettlement) {
      onUpdateSettlement(existing);
    }
  };

  const handleUnmarkSettlement = (fromId: string, toId: string) => {
    if (currentMember.id !== toId) {
      alert('Only the recipient can undo this settlement.');
      return;
    }
    if (confirm('Reopen this settlement as pending / unpaid?')) {
      const updated = trip.settlements.filter(
        (s) => !(s.fromMemberId === fromId && s.toMemberId === toId && s.status === 'settled')
      );
      if (onUpdateSettlement) {
        onUpdateSettlement(updated);
      }
    }
  };

  const handleRemindFriend = (friendName: string, amount: number) => {
    const text = encodeURIComponent(
      `Hey ${friendName}! Just a quick ping from our trip "${trip.name}" — your pending share is ${formatMoney(amount, trip.currency)}. Let me know once you settle up via UPI! 🙌`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── TOP MEMBER GREETING ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-3.5">
          <div
            className={`flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl text-white font-black text-base sm:text-lg flex-shrink-0 shadow-md ring-2 ring-white/20 dark:ring-slate-700/50 ${
              currentMember.avatarColor || 'bg-emerald-600'
            }`}
          >
            {currentMember.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                {currentMember.name}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold flex-shrink-0">
                Active Member
              </span>
              {onOpenChangePassword && (
                <button
                  type="button"
                  onClick={onOpenChangePassword}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-colors flex-shrink-0 shadow-2xs ${
                    currentMember.hasChangedPassword
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-200'
                  }`}
                  title="Click to change your login password"
                >
                  <KeyRound className="h-2.5 w-2.5 text-amber-500" />
                  <span>{currentMember.hasChangedPassword ? 'Password Set' : 'Set Custom Password'}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
              <span>
                Receiving UPI: <strong className={currentMember.upiId ? "text-emerald-600 dark:text-emerald-400 font-mono font-bold" : "text-amber-500 font-semibold italic"}>
                  {currentMember.upiId || 'Not set'}
                </strong>
              </span>
              {onUpdateMemberUpi && !isEditingMyUpi && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingMyUpi(true);
                    setMyUpiInput(currentMember.upiId || '');
                  }}
                  className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>{currentMember.upiId ? 'Change UPI' : '+ Set UPI'}</span>
                </button>
              )}
              {savedUpiSuccess && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold animate-in fade-in">
                  ✓ Saved!
                </span>
              )}
            </div>

            {isEditingMyUpi && (
              <div className="mt-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={myUpiInput}
                  onChange={(e) => setMyUpiInput(e.target.value)}
                  placeholder="e.g. yourname@okaxis or 9876543210@ybl"
                  className="flex-1 rounded-xl border border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-slate-800 px-3 py-1.5 text-base sm:text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingMyUpi(false)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateMemberUpi) {
                        onUpdateMemberUpi(myUpiInput.trim());
                      }
                      setIsEditingMyUpi(false);
                      setSavedUpiSuccess(true);
                      setTimeout(() => setSavedUpiSuccess(false), 2500);
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Save UPI
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(trip.driveFolderUrl || onOpenUploadMemories) && (
            <button
              type="button"
              onClick={onOpenUploadMemories || (() => trip.driveFolderUrl && window.open(trip.driveFolderUrl, '_blank'))}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 px-3.5 py-2 text-xs font-bold shadow-sm transition-all active:scale-95 flex-shrink-0 touch-manipulation min-h-[38px]"
              title="Upload Photos & Videos to Google Drive"
            >
              <Folder className="h-4 w-4 text-sky-500" />
              <span>📸 Upload Memories</span>
            </button>
          )}
          {onOpenAddExpense && (
            <button
              onClick={onOpenAddExpense}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-md transition-all active:scale-95 flex-shrink-0 touch-manipulation min-h-[38px]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Bill / Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* ── PERSONAL BALANCE HERO CARD ── */}
      <div
        className={`rounded-3xl p-5 sm:p-7 shadow-2xl transition-all relative overflow-hidden ${
          net > 0
            ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-emerald-600/20 ring-1 ring-white/20'
            : net < 0
            ? 'bg-gradient-to-br from-rose-600 via-rose-700 to-amber-700 text-white shadow-rose-600/20 ring-1 ring-white/20'
            : 'bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-slate-900/30 ring-1 ring-white/10'
        }`}
      >
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="min-w-0">
            <p className="text-xs font-black text-white/90 uppercase tracking-widest flex items-center gap-1.5">
              <span>{net > 0 ? '🎉 You are owed by the group' : net < 0 ? '💸 You owe the group' : '✅ You are fully settled'}</span>
            </p>
            <p className="text-3xl sm:text-5xl font-black text-white mt-2 leading-none tracking-tight break-all">
              {formatMoney(Math.abs(net), trip.currency)}
            </p>
            <p className="text-xs text-white/80 mt-2.5 max-w-md font-medium leading-relaxed">
              {net > 0
                ? 'Your direct contributions exceed your share of expenses — other friends will reimburse you.'
                : net < 0
                ? 'Your share of trip expenses exceeds what you have fronted. Settle up with friends below.'
                : 'No pending dues! All your group expenses are balanced perfectly.'}
            </p>
          </div>

          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white text-lg sm:text-xl font-black border border-white/30 shadow-inner flex-shrink-0">
            {currentMember.name.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* 3-Column Breakdown Row */}
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3.5 relative z-10">
          <div className="rounded-2xl bg-black/15 backdrop-blur-md p-3 sm:p-3.5 text-center border border-white/10">
            <p className="text-sm sm:text-lg font-black text-white leading-tight">
              {formatMoney(groupShareConsumed, trip.currency)}
            </p>
            <p className="text-[9px] sm:text-[10px] text-white/80 mt-1 uppercase tracking-wider font-semibold">Group Share</p>
          </div>
          <div className="rounded-2xl bg-black/15 backdrop-blur-md p-3 sm:p-3.5 text-center border border-white/10">
            <p className="text-sm sm:text-lg font-black text-white leading-tight">
              {formatMoney(personalSpend, trip.currency)}
            </p>
            <p className="text-[9px] sm:text-[10px] text-white/80 mt-1 uppercase tracking-wider font-semibold">Personal Spend</p>
          </div>
          <div className="rounded-2xl bg-white/20 backdrop-blur-md p-3 sm:p-3.5 text-center border border-white/25 shadow-inner">
            <p className="text-sm sm:text-lg font-black text-white leading-tight">
              {formatMoney(grandTotalCost, trip.currency)}
            </p>
            <p className="text-[9px] sm:text-[10px] text-white/95 mt-1 uppercase tracking-wider font-black">Grand Total</p>
          </div>
        </div>
      </div>

      {/* ── SETTLEMENT DUES: WHO I NEED TO PAY ── */}
      {iOweTo.length > 0 && (
        <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Settle Up: Transfers You Need to Make
            </h4>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-full">
              {iOweTo.length} Pending
            </span>
          </div>

          <div className="space-y-2.5">
            {iOweTo.map((s, idx) => {
              const to = getMember(s.toMemberId);
              const noteText = `${trip.name}_Settlement_${currentMember.name}`;
              const upiUrl = to?.upiId
                ? generateUpiUrl({
                    upiId: to.upiId,
                    payeeName: to.name,
                    amount: s.amount,
                    note: noteText,
                  })
                : null;

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/50 p-3.5 sm:p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-white text-xs font-extrabold flex-shrink-0 ${
                        to?.avatarColor || 'bg-slate-500'
                      }`}
                    >
                      {to?.name.slice(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        Pay to {to?.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono truncate max-w-[170px] sm:max-w-none">{to?.upiId || 'No UPI ID'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-rose-100/70 dark:border-rose-900/40">
                    <span className="text-base font-black text-rose-600 dark:text-rose-400 mr-1">
                      {formatMoney(s.amount, trip.currency)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {upiUrl && (
                        <a
                          href={upiUrl}
                          className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-sm min-h-[36px] touch-manipulation"
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          <span>Pay App</span>
                        </a>
                      )}

                      {onOpenQR && (
                        <button
                          type="button"
                          onClick={() => onOpenQR(to?.upiId || 'friend@upi', to?.name || 'Friend', s.amount, noteText)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all min-h-[36px] min-w-[36px] flex items-center justify-center touch-manipulation"
                          title="Show UPI QR Code"
                        >
                          <QrCode className="h-4 w-4 text-teal-500" />
                        </button>
                      )}

                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5 rounded-xl whitespace-nowrap flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-500" />
                        <span>Awaiting {to?.name?.split(' ')[0]}&apos;s verification</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── WHO OWES ME ── */}
      {owesMe.length > 0 && (
        <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Incoming Reimbursements (Friends Who Owe You)
            </h4>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
              {owesMe.length} Expected
            </span>
          </div>

          <div className="space-y-2">
            {owesMe.map((s, idx) => {
              const from = getMember(s.fromMemberId);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/50 p-3.5 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-white text-xs font-bold ${
                        from?.avatarColor || 'bg-slate-500'
                      }`}
                    >
                      {from?.name.slice(0, 2).toUpperCase() || '??'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{from?.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{from?.upiId || 'Direct'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mr-1">
                      +{formatMoney(s.amount, trip.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMarkSettlementPaid(s)}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-sm active:scale-95 touch-manipulation min-h-[34px]"
                      title="Confirm this friend has paid you"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Confirm Received</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemindFriend(from?.name || 'Friend', s.amount)}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 text-xs font-semibold transition-all min-h-[34px]"
                      title="Send WhatsApp payment reminder"
                    >
                      <Share2 className="h-3 w-3" />
                      <span>Remind</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── RECEIVED REIMBURSEMENTS (HISTORY WITH UNDO) ── */}
      {settledToMe.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Payments You Confirmed & Settled ({settledToMe.length})</span>
          </h4>
          <div className="space-y-1.5">
            {settledToMe.map((s, idx) => {
              const from = getMember(s.fromMemberId);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-slate-800/80 p-2.5 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{from?.name || 'Friend'}</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      Received {formatMoney(s.amount, trip.currency)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnmarkSettlement(s.fromMemberId, s.toMemberId)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:underline"
                    title="Undo this confirmation if money was not actually received"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Undo / Mark Unpaid</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ALL SETTLED STATE ── */}
      {net === 0 && iOweTo.length === 0 && owesMe.length === 0 && (
        <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-8 text-center shadow-sm">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-base font-bold text-emerald-800 dark:text-emerald-300">
            You are 100% settled up!
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            No pending settlement transfers remaining in the group ledger.
          </p>
        </div>
      )}

      {/* ── MY EXPENSE FEED (Collapsible) ── */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between sm:justify-start gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
            >
              <Receipt className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                My Trip Expenses ({myExpenses.length})
              </span>
              <span className="text-xs text-slate-400 ml-1 inline-flex items-center">
                {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2 py-0.5 rounded-lg transition-all ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All ({myExpenses.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('group')}
                className={`px-2 py-0.5 rounded-lg transition-all ${
                  filterType === 'group'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                👥 Shared ({myExpenses.filter((e) => !e.isPersonal).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('personal')}
                className={`px-2 py-0.5 rounded-lg transition-all ${
                  filterType === 'personal'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                👤 Personal ({myExpenses.filter((e) => e.isPersonal).length})
              </button>
            </div>
          </div>

          {myExpenses.length > 0 && (
            <button
              type="button"
              onClick={() => downloadMemberStatement(trip, currentMember)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-xs font-bold transition-all border border-emerald-200 dark:border-emerald-800 shadow-sm active:scale-95"
              title="Download Full Personal Expense Statement (PDF)"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Statement (PDF)</span>
            </button>
          )}
        </div>

        {showHistory && (
          <div className="p-4 sm:p-5 space-y-3">
            {filteredExpenses.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-3">
                {filterType === 'personal'
                  ? 'No personal expenses recorded yet. Click "Add Bill / Expense" and select "Personal"!'
                  : 'No bills found matching this filter.'}
              </p>
            ) : (
              filteredExpenses.map((exp) => {
                const payer = trip.members.find((m) => m.id === exp.paidBy) || { name: 'Friend' };
                const isPayer = exp.paidBy === currentMember.id;
                const isPersonal = Boolean(exp.isPersonal);

                const mySplit = exp.splits.find((s) => s.memberId === currentMember.id);
                const myShareAmount = isPersonal ? exp.amount : (mySplit?.amount || 0);

                return (
                  <div
                    key={exp.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border text-xs transition-all ${
                      isPersonal
                        ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50 hover:border-purple-300'
                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{exp.title}</p>
                        {isPersonal ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                            <span>👤</span> Personal Expense
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            👥 Group Shared
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {isPersonal ? (
                          <>Paid from your pocket • Total: <strong className="text-slate-700 dark:text-slate-300 font-bold">{formatMoney(exp.amount, trip.currency)}</strong></>
                        ) : (
                          `${isPayer ? 'You paid' : `Paid by ${payer.name}`} • Bill: `
                        )}
                        {!isPersonal && <strong className="text-slate-700 dark:text-slate-300 font-bold">{formatMoney(exp.amount, trip.currency)}</strong>}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-slate-700/50">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                          {isPersonal ? 'Personal Cost' : 'My Share'}
                        </span>
                        <span className={`font-black text-sm ${
                          isPersonal
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {formatMoney(myShareAmount, trip.currency)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => downloadExpenseInvoice(trip, exp, currentMember)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all active:scale-95 flex-shrink-0"
                        title="Download Official PDF Invoice Slip"
                      >
                        <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Download Invoice Slip</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
