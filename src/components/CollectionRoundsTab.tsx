'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, MessageSquare, Users, Bell } from 'lucide-react';
import { CollectionRound, Member, Trip } from '@/types';

interface CollectionRoundsTabProps {
  trip: Trip;
  canManage: boolean; // trip_manager or finance_manager
  onAddRound: (round: CollectionRound) => void;
  onUpdateRoundStatus: (roundId: string, memberId: string, status: 'paid' | 'pending' | 'partial') => void;
}

export function CollectionRoundsTab({
  trip,
  canManage,
  onAddRound,
  onUpdateRoundStatus,
}: CollectionRoundsTabProps) {
  const [showAddRound, setShowAddRound] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newDue, setNewDue] = useState('');

  const rounds = trip.collectionRounds || [];

  const handleCreate = () => {
    if (!newTitle.trim() || !newTarget) return;
    const memberStatus: Record<string, 'paid' | 'pending' | 'partial'> = {};
    trip.members.forEach((m) => { memberStatus[m.id] = 'pending'; });
    const round: CollectionRound = {
      id: `round_${Date.now()}`,
      tripId: trip.id,
      title: newTitle.trim(),
      targetPerPerson: parseFloat(newTarget),
      dueDate: newDue || undefined,
      createdAt: new Date().toISOString(),
      memberStatus,
    };
    onAddRound(round);
    setNewTitle('');
    setNewTarget('');
    setNewDue('');
    setShowAddRound(false);
  };

  const paidCount = (round: CollectionRound) =>
    Object.values(round.memberStatus).filter((s) => s === 'paid').length;
  const totalCount = (round: CollectionRound) => trip.members.length;

  const getMember = (id: string): Member | undefined =>
    trip.members.find((m) => m.id === id);

  const generateWhatsApp = (round: CollectionRound) => {
    const pending = trip.members.filter(
      (m) => round.memberStatus[m.id] !== 'paid'
    );
    const lines = [
      `💰 *Collection Round: ${round.title}*`,
      `💵 Amount per person: ₹${round.targetPerPerson.toLocaleString('en-IN')}`,
      round.dueDate ? `📅 Due by: ${round.dueDate}` : '',
      ``,
      `🔴 *Still Pending:*`,
      ...pending.map((m) => `• ${m.name}${round.memberStatus[m.id] === 'partial' ? ' (partial)' : ''}`),
      ``,
      `Please pay to UPI: ${trip.members.find((m) => m.id === trip.financeLeadId)?.upiId || ''}`,
      `✨ _TripSplit Portal_`,
    ].filter(Boolean).join('\n');
    const encoded = encodeURIComponent(lines);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Collection Rounds</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Track multi-stage advance collection (hotel, bus, daily kitty…)
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAddRound(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-md transition-all active:scale-95"
          >
            + New Round
          </button>
        )}
      </div>

      {/* Add Round Modal */}
      {showAddRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">New Collection Round</h4>
              <button onClick={() => setShowAddRound(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Round Title</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Hotel Advance, Bus Tickets, Daily Kitty"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Amount per Person (₹)</label>
                <input value={newTarget} onChange={e => setNewTarget(e.target.value)} type="number" min="0"
                  placeholder="e.g. 3000"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Due Date (optional)</label>
                <input value={newDue} onChange={e => setNewDue(e.target.value)} type="date"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowAddRound(false)} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
              <button onClick={handleCreate} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-sm font-bold text-white shadow-md transition-all">Create Round</button>
            </div>
          </div>
        </div>
      )}

      {/* Round Cards */}
      {rounds.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-10 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-800 mb-3">
            <Bell className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No collection rounds yet</p>
          <p className="text-xs text-slate-400 mt-1">Create rounds to track advances like hotel deposit, bus tickets, etc.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {rounds.map((round) => {
            const paid = paidCount(round);
            const total = totalCount(round);
            const pct = total > 0 ? (paid / total) * 100 : 0;
            const totalCollected = paid * round.targetPerPerson;

            return (
              <div key={round.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                {/* Round header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{round.title}</h4>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                      <span>₹{round.targetPerPerson.toLocaleString('en-IN')}/person</span>
                      {round.dueDate && <span>📅 Due {round.dueDate}</span>}
                      <span className="text-emerald-600 font-semibold">Collected: ₹{totalCollected.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => generateWhatsApp(round)}
                    className="flex items-center gap-1 rounded-xl bg-green-50 hover:bg-green-100 dark:bg-green-950/40 dark:hover:bg-green-900/60 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-2.5 py-1.5 text-[11px] font-bold transition-all"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Remind
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    <span>{paid}/{total} paid</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? '#10b981' : pct > 50 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </div>

                {/* Member grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {trip.members.map((member) => {
                    const status = round.memberStatus[member.id] || 'pending';
                    return (
                      <div
                        key={member.id}
                        className={`rounded-xl p-2.5 text-center border transition-all ${
                          status === 'paid'
                            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                            : status === 'partial'
                            ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                            : 'bg-slate-50 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700'
                        }`}
                      >
                        <div
                          className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full text-white text-[10px] font-bold ${member.avatarColor}`}
                        >
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate">{member.name}</p>
                        {status === 'paid' ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 mt-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Paid
                          </span>
                        ) : status === 'partial' ? (
                          <span className="text-[9px] font-bold text-amber-600 mt-0.5 block">Partial</span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-500 mt-0.5">
                            <AlertCircle className="h-2.5 w-2.5" /> Due
                          </span>
                        )}
                        {canManage && (
                          <select
                            value={status}
                            onChange={(e) =>
                              onUpdateRoundStatus(round.id, member.id, e.target.value as 'paid' | 'pending' | 'partial')
                            }
                            className="mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[9px] text-slate-700 dark:text-slate-300 px-1 py-0.5 focus:outline-none"
                          >
                            <option value="paid">✅ Paid</option>
                            <option value="partial">⚡ Partial</option>
                            <option value="pending">🔴 Pending</option>
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
