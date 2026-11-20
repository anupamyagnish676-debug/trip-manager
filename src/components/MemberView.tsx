'use client';

import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  QrCode,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Smartphone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  Briefcase,
  User,
  Plus,
  X,
  Sparkles,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Member, Trip, CollectionRound, PaymentCapture, SettlementTransfer, MemberRole } from '@/types';
import { calculateMemberBalances, simplifyDebts, generateUpiUrl } from '@/lib/calculations';
import { formatMoney, getCurrencySymbol } from '@/lib/currency';

interface MemberViewProps {
  trip: Trip;
  currentMember: Member;
  onOpenQR?: (payeeUpi: string, payeeName: string, amount: number, note: string) => void;
  onPaymentCaptured?: (payment: PaymentCapture) => void;
  onUpdateRoundStatus?: (roundId: string, memberId: string, status: 'paid' | 'pending' | 'partial') => void;
  onUpdateSettlement?: (settlements: SettlementTransfer[]) => void;
  onOpenAddExpense?: () => void;
}

export function MemberView({
  trip,
  currentMember,
  onOpenQR,
  onPaymentCaptured,
  onUpdateRoundStatus,
  onUpdateSettlement,
  onOpenAddExpense,
}: MemberViewProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [confirmingRound, setConfirmingRound] = useState<CollectionRound | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState<string>('');

  const balances = calculateMemberBalances(trip);
  const myBalance = balances.find((b) => b.member.id === currentMember.id);
  const settlements = simplifyDebts(balances);

  const iOweTo = settlements.filter(
    (s) => s.fromMemberId === currentMember.id && s.status !== 'settled'
  );
  const owesMe = settlements.filter(
    (s) => s.toMemberId === currentMember.id && s.status !== 'settled'
  );

  const getMember = (id: string) => trip.members.find((m) => m.id === id);
  const financeLead = trip.members.find((m) => m.id === trip.financeLeadId) || trip.members[0];

  const myExpenses = trip.expenses.filter((e) =>
    e.splits.some((s) => s.memberId === currentMember.id)
  );
  const myPaymentHistory = trip.payments.filter(
    (p) => p.matchedMemberId === currentMember.id
  );

  const totalIPaid = trip.expenses
    .filter((e) => e.paidBy === currentMember.id)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalIContributed = myPaymentHistory
    .filter((p) => p.status === 'verified' && p.addedToPot)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalIConsumed = myExpenses.reduce((sum, e) => {
    const mySplit = e.splits.find((s) => s.memberId === currentMember.id);
    return sum + (mySplit?.amount || 0);
  }, 0);

  const net = myBalance?.netBalance || 0;

  // Active collection rounds where this member has not completed payment
  const activeRounds = (trip.collectionRounds || []).filter(
    (r) => r.memberStatus[currentMember.id] !== 'paid'
  );
  const paidRounds = (trip.collectionRounds || []).filter(
    (r) => r.memberStatus[currentMember.id] === 'paid'
  );

  const handleOpenConfirmModal = (round: CollectionRound) => {
    setConfirmingRound(round);
    setPayAmount(round.targetPerPerson.toString());
    setUtrNumber('');
  };

  const handleConfirmCollectionPayment = () => {
    if (!confirmingRound) return;
    const amountVal = parseFloat(payAmount) || confirmingRound.targetPerPerson;
    if (amountVal <= 0) return;

    // Fire celebratory confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    const newPayment: PaymentCapture = {
      id: `pay-${Date.now()}`,
      tripId: trip.id,
      senderName: currentMember.name,
      amount: amountVal,
      utr: utrNumber.trim() || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      timestamp: new Date().toISOString(),
      rawText: `Collection payment for "${confirmingRound.title}" by ${currentMember.name}`,
      matchedMemberId: currentMember.id,
      status: 'verified',
      addedToPot: true,
      collectionRoundId: confirmingRound.id,
    };

    if (onPaymentCaptured) {
      onPaymentCaptured(newPayment);
    }

    if (onUpdateRoundStatus) {
      const isFull = amountVal >= confirmingRound.targetPerPerson;
      onUpdateRoundStatus(confirmingRound.id, currentMember.id, isFull ? 'paid' : 'partial');
    }

    setConfirmingRound(null);
  };

  const handleMarkSettlementPaid = (transfer: SettlementTransfer) => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });

    if (onUpdateSettlement) {
      const existing = [...trip.settlements];
      existing.push({
        ...transfer,
        status: 'settled',
        settledAt: new Date().toISOString(),
      });
      onUpdateSettlement(existing);
    }
  };

  const role: MemberRole = currentMember.role || 'member';

  return (
    <div className="space-y-5">
      {/* ── ROLE & PERSON IDENTIFIER BANNER ── */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white font-extrabold text-sm shadow-md ${currentMember.avatarColor}`}
          >
            {currentMember.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {currentMember.name}
              </h3>
              {role === 'finance_manager' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                  <Shield className="h-3 w-3" /> Finance Lead & Member
                </span>
              )}
              {role === 'trip_manager' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800 px-2 py-0.5 text-[10px] font-bold">
                  <Briefcase className="h-3 w-3" /> Trip Lead & Member
                </span>
              )}
              {role === 'member' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-bold">
                  <User className="h-3 w-3" /> Member
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {role === 'finance_manager'
                ? 'You manage the central pot, and you also have your personal trip share below.'
                : role === 'trip_manager'
                ? 'You organize the trip logistics, and you also have your personal trip share below.'
                : 'Here is your personal expense ledger, pending contributions, and settlement dues.'}
            </p>
          </div>
        </div>

        {onOpenAddExpense && (
          <button
            onClick={onOpenAddExpense}
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm transition-all active:scale-95 flex-shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Bill
          </button>
        )}
      </div>

      {/* ── PERSONAL BALANCE HERO CARD ── */}
      <div
        className={`rounded-3xl p-6 shadow-xl transition-all ${
          net > 0
            ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
            : net < 0
            ? 'bg-gradient-to-br from-rose-600 to-pink-700 text-white'
            : 'bg-gradient-to-br from-slate-800 to-slate-900 text-white'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              {net > 0 ? '🎉 You are owed' : net < 0 ? '💸 You owe the group' : '✅ You are fully settled'}
            </p>
            <p className="text-5xl font-black text-white mt-1.5 leading-none">
              {formatMoney(Math.abs(net), trip.currency)}
            </p>
            <p className="text-xs text-white/70 mt-2">
              {net > 0
                ? 'Your contributions exceed your consumption — others will pay you back.'
                : net < 0
                ? 'Your share of trip expenses exceeds what you have deposited or paid.'
                : 'No pending dues in the group ledger.'}
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white text-xl font-black border border-white/30">
            {currentMember.name.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Breakdown row */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-white/15 p-3 text-center backdrop-blur-sm">
            <p className="text-base font-black text-white leading-tight">
              {formatMoney(totalIPaid, trip.currency)}
            </p>
            <p className="text-[10px] text-white/80 mt-0.5">I Paid Out-of-Pocket</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 text-center backdrop-blur-sm">
            <p className="text-base font-black text-white leading-tight">
              {formatMoney(totalIContributed, trip.currency)}
            </p>
            <p className="text-[10px] text-white/80 mt-0.5">Pot Deposits</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 text-center backdrop-blur-sm">
            <p className="text-base font-black text-white leading-tight">
              {formatMoney(totalIConsumed, trip.currency)}
            </p>
            <p className="text-[10px] text-white/80 mt-0.5">My Consumption</p>
          </div>
        </div>
      </div>

      {/* ── ACTIVE COLLECTION ROUNDS (Raised by Finance Manager) ── */}
      {activeRounds.length > 0 && (
        <div className="space-y-3">
          {/* Prominent Pending Amount Alert Card */}
          <div className="rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-100 bg-white/20 px-2 py-0.5 rounded-full">
                ⚡ Action Required • Pay to Finance Manager
              </span>
              <p className="text-3xl font-black mt-1">
                {formatMoney(activeRounds.reduce((sum, r) => sum + r.targetPerPerson, 0), trip.currency)}
              </p>
              <p className="text-xs text-amber-100 mt-0.5">
                Total pending collection dues requested by Finance Manager {financeLead.name}
              </p>
            </div>
            <div className="text-right sm:text-right">
              <span className="text-xs font-bold bg-white text-slate-900 px-3 py-1.5 rounded-xl shadow-sm inline-block">
                {activeRounds.length} Pending Round{activeRounds.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Collection Breakdown ({activeRounds.length} Request{activeRounds.length > 1 ? 's' : ''})
              </h4>
            </div>
            <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-bold">
              Pay via UPI / QR
            </span>
          </div>

          {activeRounds.map((round) => {
            const myStatus = round.memberStatus[currentMember.id] || 'pending';
            const isPartial = myStatus === 'partial';
            const noteText = `${round.title.replace(/\s+/g, '_')}_${currentMember.name}`;
            const upiUrl = financeLead?.upiId
              ? generateUpiUrl({
                  upiId: financeLead.upiId,
                  payeeName: financeLead.name,
                  amount: round.targetPerPerson,
                  note: noteText,
                })
              : null;

            return (
              <div
                key={round.id}
                className="rounded-3xl border-2 border-amber-300/80 dark:border-amber-700/80 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 dark:from-amber-950/30 dark:via-slate-900 dark:to-orange-950/20 p-5 shadow-md"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="text-base font-bold text-slate-900 dark:text-white">
                        {round.title}
                      </h5>
                      {isPartial ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                          <AlertCircle className="h-3 w-3" /> Partial — pay balance
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400 px-2 py-0.5 text-[10px] font-bold">
                          <Clock className="h-3 w-3" /> Due
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                      <span>
                        Receiving Treasurer:{' '}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {financeLead.name} {financeLead.id === currentMember.id ? '(You)' : ''}
                        </strong>
                      </span>
                      {round.dueDate && (
                        <>
                          <span>•</span>
                          <span>
                            Due Date: <strong className="text-rose-600 dark:text-rose-400">{round.dueDate}</strong>
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                      {formatMoney(round.targetPerPerson, trip.currency)}
                    </p>
                    <p className="text-[10px] text-slate-400">your share</p>
                  </div>
                </div>

                {/* Receiver UPI preview */}
                <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-3 mb-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      Pay to Receiving Account
                    </span>
                    <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 select-all">
                      {financeLead.upiId || trip.paymentMethods?.upiId || trip.paymentMethods?.paypalUrl || trip.paymentMethods?.venmoHandle || 'Payment details configured in QR'}
                    </p>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    Zero Fees
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Option 1: Mobile Deep Link */}
                  {upiUrl ? (
                    <a
                      href={upiUrl}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-2.5 px-3 text-xs font-bold shadow-md transition-all text-center"
                    >
                      <Smartphone className="h-4 w-4" />
                      Pay via App (PhonePe/GPay)
                    </a>
                  ) : null}

                  {/* Option 2: Show QR Code Modal */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenQR) {
                        onOpenQR(
                          financeLead.upiId || trip.paymentMethods?.upiId || 'treasury@upi',
                          financeLead.name,
                          round.targetPerPerson,
                          noteText
                        );
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 py-2.5 px-3 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                  >
                    <QrCode className="h-4 w-4 text-teal-500" />
                    Show QR Code
                  </button>

                  {/* Option 3: Confirm Payment */}
                  <button
                    type="button"
                    onClick={() => handleOpenConfirmModal(round)}
                    className="flex items-center justify-center gap-1.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white py-2.5 px-3 text-xs font-bold shadow-sm transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    I&apos;ve Paid (Submit)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── COMPLETED COLLECTION ROUNDS ── */}
      {paidRounds.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/20 p-3.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {paidRounds.length} collection round{paidRounds.length > 1 ? 's' : ''} completed:{' '}
              <span className="font-normal text-emerald-700 dark:text-emerald-400">
                {paidRounds.map((r) => `${r.title} (${formatMoney(r.targetPerPerson, trip.currency)})`).join(', ')}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ── SETTLEMENT DUED: WHO I NEED TO PAY ── */}
      {iOweTo.length > 0 && (
        <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Settle Up: Transfers You Need to Make
            </h4>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-full">
              Final Dues
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/50 p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-white text-xs font-extrabold flex-shrink-0 ${
                        to?.avatarColor || 'bg-slate-500'
                      }`}
                    >
                      {to?.name.slice(0, 2).toUpperCase() || '??'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Pay to {to?.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">{to?.upiId || 'No UPI ID'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-base font-black text-rose-600 dark:text-rose-400 mr-2">
                      {formatMoney(s.amount, trip.currency)}
                    </span>

                    {upiUrl && (
                      <a
                        href={upiUrl}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition-all active:scale-95"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        Pay
                      </a>
                    )}

                    {to?.upiId && onOpenQR && (
                      <button
                        type="button"
                        onClick={() => onOpenQR(to.upiId!, to.name, s.amount, noteText)}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        title="Show QR Code"
                      >
                        <QrCode className="h-4 w-4 text-teal-500" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleMarkSettlementPaid(s)}
                      className="rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950 px-2.5 py-1.5 text-xs font-semibold transition-all"
                    >
                      Mark Settled
                    </button>
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
          <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Incoming Payments (Friends who owe you)
          </h4>
          <div className="space-y-2">
            {owesMe.map((s, idx) => {
              const from = getMember(s.fromMemberId);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/50 p-3.5"
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
                      <p className="text-[10px] text-slate-400 font-mono">{from?.upiId}</p>
                    </div>
                  </div>

                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    +{formatMoney(s.amount, trip.currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ALL SETTLED STATE ── */}
      {net === 0 && iOweTo.length === 0 && owesMe.length === 0 && activeRounds.length === 0 && (
        <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-8 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-base font-bold text-emerald-800 dark:text-emerald-300">
            You are 100% settled up!
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            No pending collection rounds or settlement transfers remaining.
          </p>
        </div>
      )}

      {/* ── MY EXPENSE FEED (Collapsible) ── */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              My Trip Expense History ({myExpenses.length} bills)
            </span>
          </div>
          {showHistory ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {showHistory && (
          <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {myExpenses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No expenses found</p>
            ) : (
              myExpenses.map((exp) => {
                const mySplit = exp.splits.find((s) => s.memberId === currentMember.id);
                const isPayer = exp.paidBy === currentMember.id;
                const payerName =
                  exp.paidBy === 'POT'
                    ? 'Trip Pot'
                    : isPayer
                    ? 'You'
                    : getMember(exp.paidBy)?.name || 'Friend';

                return (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {exp.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {exp.paidAt} • Paid by{' '}
                        <strong className="text-slate-600 dark:text-slate-300">{payerName}</strong>
                        {isPayer && ' (You fronted the full bill)'}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p
                        className={`text-xs font-black ${
                          isPayer ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {isPayer
                          ? `Total: ${formatMoney(exp.amount, trip.currency)}`
                          : `My share: ${formatMoney(mySplit?.amount || 0, trip.currency)}`}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {isPayer
                          ? `Your share: ${formatMoney(mySplit?.amount || 0, trip.currency)}`
                          : `Bill total: ${formatMoney(exp.amount, trip.currency)}`}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── CONFIRM PAYMENT MODAL ── */}
      {confirmingRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                Confirm Payment
              </h4>
              <button
                type="button"
                onClick={() => setConfirmingRound(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5">
                <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 tracking-wider">
                  Collection Round
                </span>
                <p className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200 mt-0.5">
                  {confirmingRound.title}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                  Recipient:{' '}
                  <strong>
                    {financeLead.name} ({financeLead.upiId || 'Treasurer VPA'})
                  </strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount Paid ({getCurrencySymbol(trip.currency)})
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  UPI UTR / Reference No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 425019283741 from bank SMS"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setConfirmingRound(null)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCollectionPayment}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm & Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
