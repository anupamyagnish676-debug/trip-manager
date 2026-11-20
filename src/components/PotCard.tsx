'use client';

import React from 'react';
import { Wallet, QrCode, Sparkles, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { Trip } from '@/types';
import { calculatePotSummary } from '@/lib/calculations';

interface PotCardProps {
  trip: Trip;
  onOpenQR: () => void;
  onOpenCapture: () => void;
  onOpenAddExpense: () => void;
}

export function PotCard({
  trip,
  onOpenQR,
  onOpenCapture,
  onOpenAddExpense,
}: PotCardProps) {
  const pot = calculatePotSummary(trip);
  const financeLead = trip.members.find((m) => m.id === trip.financeLeadId) || trip.members[0] || { name: 'Finance Lead', upiId: '' };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-6 text-white shadow-2xl">
      {/* Background ambient pattern */}
      <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-semibold text-emerald-100 border border-white/20">
              <Wallet className="h-3.5 w-3.5" />
              <span>Central Trip Treasury (Kitty)</span>
            </div>
            <p className="mt-3 text-xs text-emerald-100 font-medium">Available Pot Balance</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mt-0.5">
              ₹{pot.balance.toLocaleString('en-IN')}
            </h2>
            <p className="mt-1 text-xs text-emerald-200">
              Finance Lead: <strong className="text-white">{financeLead.name}</strong> {financeLead.upiId ? `(${financeLead.upiId})` : ''}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap sm:flex-col gap-2">
            <button
              type="button"
              onClick={onOpenQR}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-md hover:bg-emerald-50 active:scale-95 transition-all"
            >
              <QrCode className="h-4 w-4 text-emerald-600" />
              Show Finance Lead QR
            </button>

            <button
              type="button"
              onClick={onOpenCapture}
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/30 hover:bg-emerald-500/40 border border-emerald-400/40 px-4 py-2.5 text-xs font-bold text-white shadow-md active:scale-95 transition-all backdrop-blur-sm"
            >
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Auto-Capture Inbound UPI
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-black/20 p-3 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-1 text-[11px] text-emerald-200">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>Total Collected (QR)</span>
            </div>
            <p className="text-lg font-bold mt-0.5 text-white">
              ₹{pot.totalDeposited.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="rounded-2xl bg-black/20 p-3 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-1 text-[11px] text-rose-200">
              <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
              <span>Spent from Pot</span>
            </div>
            <p className="text-lg font-bold mt-0.5 text-white">
              ₹{pot.totalSpent.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-2xl bg-black/20 p-3 backdrop-blur-sm border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-300">Active Friends</p>
              <p className="text-lg font-bold text-white">{trip.members.length} Members</p>
            </div>
            <button
              onClick={onOpenAddExpense}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 p-2 text-white shadow-sm transition-all"
              title="Add New Expense"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
