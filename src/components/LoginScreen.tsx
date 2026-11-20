'use client';

import React, { useState } from 'react';
import { X, User, LogIn, Shield, Briefcase, Users } from 'lucide-react';
import { Member, MemberRole, Trip } from '@/types';
import { saveSession } from '@/lib/session';

interface LoginScreenProps {
  trip: Trip;
  onLoggedIn: () => void;
}

const ROLE_ICONS: Record<MemberRole, React.ReactNode> = {
  finance_manager: <Shield className="h-4 w-4 text-emerald-600" />,
  trip_manager: <Briefcase className="h-4 w-4 text-sky-600" />,
  member: <Users className="h-4 w-4 text-slate-500" />,
};

const ROLE_LABELS: Record<MemberRole, string> = {
  finance_manager: 'Finance Manager',
  trip_manager: 'Trip Manager',
  member: 'Member',
};

const ROLE_BADGE_COLORS: Record<MemberRole, string> = {
  finance_manager: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  trip_manager: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
  member: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export function LoginScreen({ trip, onLoggedIn }: LoginScreenProps) {
  const [selected, setSelected] = useState<Member | null>(null);

  const handleLogin = () => {
    if (!selected) return;
    saveSession({
      memberId: selected.id,
      tripId: trip.id,
      role: selected.role || 'member',
    });
    onLoggedIn();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-2xl text-3xl font-black mb-4">
            ₹
          </div>
          <h1 className="text-2xl font-extrabold text-white">{trip.name}</h1>
          <p className="text-sm text-emerald-400 mt-1 flex items-center justify-center gap-1.5">
            📍 {trip.destination}
            {trip.inviteCode && (
              <span className="ml-2 text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-mono">
                #{trip.inviteCode}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-400 mt-3">
            Select your name to access your personalised view
          </p>
        </div>

        {/* Member list */}
        <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-4 space-y-2 shadow-2xl">
          <p className="text-xs font-bold text-white/60 uppercase tracking-wider px-1 pb-1">
            {trip.members.length} Trip Members
          </p>
          {trip.members.map((member) => {
            const role: MemberRole = member.role || 'member';
            const isSelected = selected?.id === member.id;
            return (
              <button
                key={member.id}
                onClick={() => setSelected(member)}
                className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all border ${
                  isSelected
                    ? 'bg-white/20 border-white/40 shadow-md'
                    : 'bg-white/5 border-transparent hover:bg-white/10'
                }`}
              >
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white text-xs font-extrabold ${member.avatarColor}`}
                >
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white block truncate">{member.name}</span>
                  <span className={`inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold rounded-full border px-1.5 py-0.5 ${ROLE_BADGE_COLORS[role]}`}>
                    {ROLE_ICONS[role]}
                    {ROLE_LABELS[role]}
                  </span>
                </div>
                {isSelected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleLogin}
          disabled={!selected}
          className={`mt-5 w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-all shadow-lg ${
            selected
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white active:scale-98'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          <LogIn className="h-4 w-4" />
          {selected ? `Enter as ${selected.name}` : 'Select your name above'}
        </button>

        <p className="text-center text-[11px] text-slate-500 mt-4">
          Your name isn't here? Ask the trip organizer to add you.
        </p>
      </div>
    </div>
  );
}
