'use client';

import React, { useState } from 'react';
import {
  Shield,
  Briefcase,
  Users,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  KeyRound,
  CheckCircle2,
  Sparkles,
  MapPin,
  Car,
  Hotel,
  UtensilsCrossed,
  Compass,
  Camera,
} from 'lucide-react';
import { Member, MemberRole, Trip, TripSpecialty } from '@/types';
import { saveSession } from '@/lib/session';

interface LoginScreenProps {
  trip: Trip;
  onLoggedIn: () => void;
}

const SPECIALTY_BADGES: Record<TripSpecialty, { label: string; icon: React.ReactNode; color: string }> = {
  transport: { label: 'Transport Lead', icon: <Car className="h-3 w-3" />, color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  stay: { label: 'Stay Coordinator', icon: <Hotel className="h-3 w-3" />, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' },
  food: { label: 'Food Lead', icon: <UtensilsCrossed className="h-3 w-3" />, color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' },
  activities: { label: 'Activities Guide', icon: <Compass className="h-3 w-3" />, color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300' },
  photos: { label: 'Media Lead', icon: <Camera className="h-3 w-3" />, color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' },
  none: { label: 'Member', icon: <Users className="h-3 w-3" />, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

export function LoginScreen({ trip, onLoggedIn }: LoginScreenProps) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRoster, setShowRoster] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedId = loginId.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedId || !trimmedPass) {
      setErrorMsg('Please enter both Login ID and Password');
      return;
    }

    // Match member by loginId or name
    const found = trip.members.find(
      (m) =>
        m.loginId?.toLowerCase() === trimmedId ||
        m.name?.toLowerCase() === trimmedId ||
        m.phone === trimmedId
    );

    if (!found) {
      setErrorMsg(`No member found with Login ID "${trimmedId}". Ask your Trip Manager for your credentials.`);
      return;
    }

    if (found.password !== trimmedPass) {
      setErrorMsg(`Incorrect password for ${found.name}. Ask your Trip Manager to check or reset your password.`);
      return;
    }

    // Valid credentials! Save session
    saveSession({
      memberId: found.id,
      tripId: trip.id,
      role: found.role || 'member',
    });

    onLoggedIn();
  };

  const handleQuickFill = (member: Member) => {
    setLoginId(member.loginId);
    setPassword(member.password);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-2xl text-2xl font-black mb-3">
            ₹
          </div>
          <div className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 text-[11px] font-bold text-emerald-300 mb-2">
            Trip Group Portal
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{trip.name}</h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5">
            <MapPin className="h-3 w-3 text-emerald-400" />
            <span>{trip.destination}</span>
            <span>•</span>
            <span>{trip.members.length} Group Members</span>
          </p>
        </div>

        {/* Main Login Card */}
        <div className="rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 shadow-2xl space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              Member Sign In
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter the Login ID & Password provided by your Trip Manager.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Login ID Input */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Login ID / Username
              </label>
              <input
                type="text"
                autoCapitalize="none"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="e.g. anupam, sneha, amit"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Password
                </label>
                <span className="text-[10px] text-slate-500">Set by Trip Manager</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="rounded-xl bg-rose-950/60 border border-rose-800/80 p-3 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-98"
            >
              <LogIn className="h-4 w-4" />
              Sign In to Portal
            </button>
          </form>

          {/* Quick Demo Switcher Accordion */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowRoster(!showRoster)}
              className="w-full flex items-center justify-between py-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <span>🔑 Quick-Fill Demo Credentials (TM / FM / Members)</span>
              <span>{showRoster ? '▲' : '▼'}</span>
            </button>

            {showRoster && (
              <div className="mt-2.5 space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {trip.members.map((member) => {
                  const spec = member.specialty || 'none';
                  const badge = SPECIALTY_BADGES[spec];
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleQuickFill(member)}
                      className="w-full flex items-center justify-between rounded-xl bg-slate-950/60 hover:bg-slate-800/60 p-2.5 text-left border border-slate-800/60 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-lg text-white text-[9px] font-black ${member.avatarColor}`}
                        >
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-white">{member.name}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">
                            ({member.loginId} / {member.password})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {member.role === 'finance_manager' && (
                          <span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 text-[9px] font-bold">
                            Finance Lead
                          </span>
                        )}
                        {member.role === 'trip_manager' && (
                          <span className="rounded bg-sky-500/20 text-sky-300 px-1.5 py-0.5 text-[9px] font-bold">
                            Trip Lead
                          </span>
                        )}
                        {member.role === 'member' && badge && spec !== 'none' && (
                          <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold ${badge.color}`}>
                            {badge.icon} {badge.label}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Privacy Footnote */}
          <div className="text-center pt-1">
            <p className="text-[10px] text-slate-500 leading-tight">
              🔒 Privacy Protected: Regular members only see their own pending dues and splits. Only the Finance Manager sees all group financial totals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
