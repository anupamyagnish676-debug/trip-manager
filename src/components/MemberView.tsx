'use client';

import React from 'react';
import { ArrowRight, TrendingDown, TrendingUp, Wallet, QrCode } from 'lucide-react';
import { Member, Trip, MemberBalance } from '@/types';
import { calculateMemberBalances, simplifyDebts, generateUpiUrl } from '@/lib/calculations';

interface MemberViewProps {
  trip: Trip;
  currentMember: Member;
}

export function MemberView({ trip, currentMember }: MemberViewProps) {
  const balances = calculateMemberBalances(trip);
  const myBalance = balances.find((b) => b.member.id === currentMember.id);
  const settlements = simplifyDebts(balances);

  const myPayments = settlements.filter(
    (s) => s.fromMemberId === currentMember.id || s.toMemberId === currentMember.id
  );

  const iOweTo = settlements.filter((s) => s.fromMemberId === currentMember.id && s.status !== 'settled');
  const owesMe = settlements.filter((s) => s.toMemberId === currentMember.id && s.status !== 'settled');

  const getMember = (id: string) => trip.members.find((m) => m.id === id);
  const financeLead = trip.members.find((m) => m.id === trip.financeLeadId);

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

  return (
    <div className="space-y-5">
      {/* My Balance Card */}
      <div
        className={`rounded-3xl p-6 shadow-lg ${
          net >= 0
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
            : 'bg-gradient-to-br from-rose-500 to-pink-600'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              {net >= 0 ? '🎉 You are owed' : '💸 You owe'}
            </p>
            <p className="text-4xl font-black text-white mt-1">
              ₹{Math.abs(net).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-white/60 mt-1">
              {net >= 0
                ? 'Others owe you money — you over-contributed'
                : 'You need to pay up your share'}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white text-2xl font-black">
            {currentMember.name.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/15 p-3 text-center">
            <p className="text-lg font-black text-white">₹{totalIPaid.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-white/70">I Paid Directly</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 text-center">
            <p className="text-lg font-black text-white">₹{totalIContributed.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-white/70">Pot Deposit</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 text-center">
            <p className="text-lg font-black text-white">₹{totalIConsumed.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-white/70">My Share Used</p>
          </div>
        </div>
      </div>

      {/* Who I need to pay */}
      {iOweTo.length > 0 && (
        <div className="rounded-3xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-5 shadow-sm">
          <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" /> You need to pay
          </h4>
          <div className="space-y-3">
            {iOweTo.map((s, i) => {
              const to = getMember(s.toMemberId);
              const upiUrl = to?.upiId
                ? generateUpiUrl({ upiId: to.upiId, payeeName: to.name, amount: s.amount, note: `${trip.name} Settlement` })
                : null;
              return (
                <div key={i} className="flex items-center justify-between gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/50 p-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white text-xs font-bold ${to?.avatarColor || 'bg-slate-500'}`}>
                      {to?.name.slice(0, 2).toUpperCase() || '??'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{to?.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{to?.upiId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                      ₹{s.amount.toLocaleString('en-IN')}
                    </span>
                    {upiUrl && (
                      <a
                        href={upiUrl}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-[10px] font-bold transition-all"
                      >
                        <QrCode className="h-3 w-3" /> Pay
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Who owes me */}
      {owesMe.length > 0 && (
        <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-5 shadow-sm">
          <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> They owe you
          </h4>
          <div className="space-y-3">
            {owesMe.map((s, i) => {
              const from = getMember(s.fromMemberId);
              return (
                <div key={i} className="flex items-center justify-between gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/50 p-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white text-xs font-bold ${from?.avatarColor || 'bg-slate-500'}`}>
                      {from?.name.slice(0, 2).toUpperCase() || '??'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{from?.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{from?.upiId}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    +₹{s.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {net === 0 && iOweTo.length === 0 && owesMe.length === 0 && (
        <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-6 text-center">
          <div className="text-3xl mb-2">🎉</div>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">You're fully settled!</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">No pending dues. Enjoy the trip!</p>
        </div>
      )}

      {/* My expense history */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">My Expense History</h4>
        {myExpenses.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No expenses yet</p>
        ) : (
          <div className="space-y-2">
            {myExpenses.map((exp) => {
              const mySplit = exp.splits.find((s) => s.memberId === currentMember.id);
              return (
                <div key={exp.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{exp.title}</p>
                    <p className="text-[10px] text-slate-400">{exp.paidAt} • {exp.paidBy === currentMember.id ? '🧾 You paid' : `Paid by ${getMember(exp.paidBy)?.name || 'Pot'}`}</p>
                  </div>
                  <span className={`text-xs font-black ${exp.paidBy === currentMember.id ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}>
                    {exp.paidBy === currentMember.id ? `-₹${exp.amount.toLocaleString('en-IN')}` : `₹${mySplit?.amount.toLocaleString('en-IN') || 0}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
