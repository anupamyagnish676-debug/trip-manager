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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Member, Trip, SettlementTransfer } from '@/types';
import { calculateMemberBalances, simplifyDebts, generateUpiUrl } from '@/lib/calculations';
import { formatMoney } from '@/lib/currency';

interface MemberViewProps {
  trip: Trip;
  currentMember: Member;
  onOpenQR?: (payeeUpi: string, payeeName: string, amount: number, note: string) => void;
  onUpdateSettlement?: (settlements: SettlementTransfer[]) => void;
  onOpenAddExpense?: () => void;
}

export function MemberView({
  trip,
  currentMember,
  onOpenQR,
  onUpdateSettlement,
  onOpenAddExpense,
}: MemberViewProps) {
  const [showHistory, setShowHistory] = useState(true);

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

  const myExpenses = trip.expenses.filter((e) =>
    e.splits.some((s) => s.memberId === currentMember.id)
  );

  const totalIPaid = trip.expenses
    .filter((e) => e.paidBy === currentMember.id)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalIConsumed = myExpenses.reduce((sum, e) => {
    const mySplit = e.splits.find((s) => s.memberId === currentMember.id);
    return sum + (mySplit?.amount || 0);
  }, 0);

  const net = myBalance?.netBalance || 0;

  const handleMarkSettlementPaid = (transfer: SettlementTransfer) => {
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

  const handleRemindFriend = (friendName: string, amount: number) => {
    const text = encodeURIComponent(
      `Hey ${friendName}! Just a quick ping from our trip "${trip.name}" — your pending share is ${formatMoney(amount, trip.currency)}. Let me know once you settle up via UPI! 🙌`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* ── TOP MEMBER GREETING ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white font-black text-lg flex-shrink-0 shadow-md ${
              currentMember.avatarColor || 'bg-emerald-600'
            }`}
          >
            {currentMember.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {currentMember.name}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                Active Member
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personal expense ledger, pending dues, and real-time settlement transfers
            </p>
          </div>
        </div>

        {onOpenAddExpense && (
          <button
            onClick={onOpenAddExpense}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-md transition-all active:scale-95 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Bill / Expense</span>
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
            <p className="text-xs font-bold text-white/80 uppercase tracking-wider">
              {net > 0 ? '🎉 You are owed by the group' : net < 0 ? '💸 You owe the group' : '✅ You are fully settled'}
            </p>
            <p className="text-5xl font-black text-white mt-1.5 leading-none">
              {formatMoney(Math.abs(net), trip.currency)}
            </p>
            <p className="text-xs text-white/75 mt-2 max-w-md">
              {net > 0
                ? 'Your direct contributions exceed your share of expenses — other friends will reimburse you.'
                : net < 0
                ? 'Your share of trip expenses exceeds what you have fronted. Settle up with friends below.'
                : 'No pending dues! All your group expenses are balanced perfectly.'}
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white text-xl font-black border border-white/30 shadow-inner">
            {currentMember.name.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* 2-Column Breakdown Row */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/15 p-3.5 text-center backdrop-blur-sm border border-white/10">
            <p className="text-lg font-black text-white leading-tight">
              {formatMoney(totalIPaid, trip.currency)}
            </p>
            <p className="text-[11px] text-white/80 mt-1">Total I Paid (Out of Pocket)</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-3.5 text-center backdrop-blur-sm border border-white/10">
            <p className="text-lg font-black text-white leading-tight">
              {formatMoney(totalIConsumed, trip.currency)}
            </p>
            <p className="text-[11px] text-white/80 mt-1">My Total Share of Bills</p>
          </div>
        </div>
      </div>

      {/* ── SETTLEMENT DUES: WHO I NEED TO PAY ── */}
      {iOweTo.length > 0 && (
        <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
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
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-sm"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        Pay via App
                      </a>
                    )}

                    {to?.upiId && onOpenQR && (
                      <button
                        type="button"
                        onClick={() => onOpenQR(to.upiId!, to.name, s.amount, noteText)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all"
                        title="Show UPI QR Code"
                      >
                        <QrCode className="h-4 w-4 text-teal-500" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleMarkSettlementPaid(s)}
                      className="rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950 px-3 py-1.5 text-xs font-semibold transition-all"
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
                      onClick={() => handleRemindFriend(from?.name || 'Friend', s.amount)}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 text-xs font-semibold transition-all"
                      title="Send WhatsApp payment reminder"
                    >
                      <Share2 className="h-3 w-3" />
                      Remind
                    </button>
                  </div>
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
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              My Trip Expense Breakdown ({myExpenses.length} bills)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{showHistory ? 'Collapse' : 'Expand'}</span>
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {showHistory && (
          <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-2.5">
            {myExpenses.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-3">
                No bills recorded with your share yet. Click &ldquo;Add Bill / Expense&rdquo; above!
              </p>
            ) : (
              myExpenses.map((exp) => {
                const payer = trip.members.find((m) => m.id === exp.paidBy) || { name: 'Friend' };
                const mySplit = exp.splits.find((s) => s.memberId === currentMember.id);
                const isPayer = exp.paidBy === currentMember.id;

                return (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{exp.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isPayer ? 'You paid' : `Paid by ${payer.name}`} • Bill: {formatMoney(exp.amount, trip.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-800 dark:text-slate-200">
                        My share: {formatMoney(mySplit?.amount || 0, trip.currency)}
                      </span>
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
