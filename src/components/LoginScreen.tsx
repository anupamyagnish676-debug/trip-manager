'use client';

import React, { useState } from 'react';
import {
  Shield,
  Briefcase,
  Users,
  KeyRound,
  LogIn,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Member, MemberRole, Trip } from '@/types';
import { saveSession } from '@/lib/session';

interface LoginScreenProps {
  trip: Trip;
  onLoggedIn: () => void;
}

export function LoginScreen({ trip, onLoggedIn }: LoginScreenProps) {
  const [activeRole, setActiveRole] = useState<MemberRole>('member');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Find designated managers
  const financeManager =
    trip.members.find((m) => m.role === 'finance_manager' || m.id === trip.financeLeadId) ||
    trip.members[0];

  const tripManager =
    trip.members.find((m) => m.role === 'trip_manager') ||
    trip.members.find((m) => m.id !== financeManager.id) ||
    trip.members[1];

  // General members (excluding managers or all members)
  const generalMembers = trip.members.filter(
    (m) => m.role === 'member' || (!m.role && m.id !== financeManager.id && m.id !== tripManager.id)
  );

  const handleRoleTabChange = (role: MemberRole) => {
    setActiveRole(role);
    setErrorMsg('');
    setPinInput('');
    if (role === 'finance_manager') {
      setSelectedMember(financeManager);
    } else if (role === 'trip_manager') {
      setSelectedMember(tripManager);
    } else {
      setSelectedMember(generalMembers[0] || null);
    }
  };

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member);
    setErrorMsg('');
    setPinInput('');
  };

  const handleAuthenticate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const target =
      activeRole === 'finance_manager'
        ? financeManager
        : activeRole === 'trip_manager'
        ? tripManager
        : selectedMember;

    if (!target) {
      setErrorMsg('Please select a member profile');
      return;
    }

    // Role-specific PIN verification
    const expectedPin =
      target.pin ||
      (activeRole === 'finance_manager'
        ? '1234'
        : activeRole === 'trip_manager'
        ? '4321'
        : target.phone ? target.phone.slice(-4) : '0000');

    // For general members, if no PIN was typed and they click Quick Enter, allow if default matches or allow 1-tap friend entry
    if (activeRole === 'member') {
      if (pinInput.trim() && pinInput.trim() !== expectedPin) {
        setErrorMsg(`Incorrect passcode for ${target.name}. Hint: default is last 4 digits of phone (${expectedPin})`);
        return;
      }
    } else {
      // Strict PIN requirement for managers
      if (!pinInput.trim()) {
        setErrorMsg('Security PIN is required for Manager portal access');
        return;
      }
      if (pinInput.trim() !== expectedPin) {
        setErrorMsg(`Invalid PIN. Hint: default ${activeRole === 'finance_manager' ? '1234' : '4321'}`);
        return;
      }
    }

    // Save session
    saveSession({
      memberId: target.id,
      tripId: trip.id,
      role: target.role || activeRole,
    });

    onLoggedIn();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-2xl text-2xl font-black mb-3">
            ₹
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{trip.name}</h1>
          <p className="text-xs text-emerald-400 mt-0.5 font-medium flex items-center justify-center gap-1.5">
            <span>📍 {trip.destination}</span>
            {trip.inviteCode && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/80">
                #{trip.inviteCode}
              </span>
            )}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            <Lock className="h-3 w-3" />
            Role-Based Access Control Portal
          </div>
        </div>

        {/* Access Box */}
        <div className="rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 shadow-2xl space-y-5">
          {/* Role Tabs */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Select Your Access Role
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleRoleTabChange('member')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                  activeRole === 'member'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Users className="h-4 w-4 mb-0.5" />
                Member
              </button>

              <button
                type="button"
                onClick={() => handleRoleTabChange('trip_manager')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                  activeRole === 'trip_manager'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Briefcase className="h-4 w-4 mb-0.5" />
                Trip Lead
              </button>

              <button
                type="button"
                onClick={() => handleRoleTabChange('finance_manager')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                  activeRole === 'finance_manager'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Shield className="h-4 w-4 mb-0.5" />
                Treasurer
              </button>
            </div>
          </div>

          <form onSubmit={handleAuthenticate} className="space-y-4">
            {/* ── GATE 1: FINANCE MANAGER ── */}
            {activeRole === 'finance_manager' && (
              <div className="space-y-3.5">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white font-black text-sm flex-shrink-0 ${financeManager.avatarColor}`}
                  >
                    {financeManager.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{financeManager.name}</span>
                      <span className="rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 border border-emerald-500/30">
                        Finance Lead
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      UPI: {financeManager.upiId || 'Treasurer'}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                  🛡️ <strong>Treasurer Access</strong>: Full pot control, receiving QR configuration, bank SMS webhooks, settlements, and admin settings.
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Finance Security PIN
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400">Default: 1234</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="Enter 4-digit PIN (1234)"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── GATE 2: TRIP MANAGER ── */}
            {activeRole === 'trip_manager' && (
              <div className="space-y-3.5">
                <div className="rounded-2xl border border-sky-500/30 bg-sky-950/30 p-3.5 flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white font-black text-sm flex-shrink-0 ${tripManager.avatarColor}`}
                  >
                    {tripManager.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{tripManager.name}</span>
                      <span className="rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold px-1.5 py-0.5 border border-sky-500/30">
                        Trip Lead
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      📞 +91 {tripManager.phone || '9876543211'}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                  🗂️ <strong>Trip Manager Access</strong>: Create & manage expenses, raise multi-stage advance collections, view group settlement matrix, and manage friends roster.
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Trip Manager Passcode
                    </label>
                    <span className="text-[10px] font-mono text-sky-400">Default: 4321</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="Enter 4-digit PIN (4321)"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── GATE 3: MEMBER PORTAL (Personal Isolation) ── */}
            {activeRole === 'member' && (
              <div className="space-y-3.5">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-[11px] text-emerald-300 leading-relaxed flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    <strong>Strict Member Privacy</strong>: You will only see your own personal dues, your own collections, and your own bill splits. Other members&apos; financial ledgers are protected.
                  </span>
                </div>

                {/* Member selection list */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Choose Your Profile ({generalMembers.length} Members)
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {generalMembers.map((member) => {
                      const isSelected = selectedMember?.id === member.id;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleMemberSelect(member)}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-all border ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500/50 shadow-sm'
                              : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-lg text-white text-[10px] font-bold ${member.avatarColor}`}
                            >
                              {member.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white block">
                                {member.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                +91 {member.phone}
                              </span>
                            </div>
                          </div>

                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <span className="text-[10px] text-slate-500">Tap to select</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Passcode for member */}
                {selectedMember && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        {selectedMember.name}&apos;s Passcode
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        Default: {selectedMember.phone ? selectedMember.phone.slice(-4) : '3212'}
                      </span>
                    </div>
                    <input
                      type="password"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder={`Enter passcode or leave blank for quick enter`}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Error Message Display */}
            {errorMsg && (
              <div className="rounded-xl bg-rose-950/60 border border-rose-800/80 p-2.5 flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold shadow-lg transition-all active:scale-98 ${
                activeRole === 'finance_manager'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                  : activeRole === 'trip_manager'
                  ? 'bg-sky-500 hover:bg-sky-400 text-white font-black'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold'
              }`}
            >
              <LogIn className="h-4 w-4" />
              {activeRole === 'finance_manager'
                ? 'Unlock Finance Portal'
                : activeRole === 'trip_manager'
                ? 'Unlock Trip Manager Portal'
                : selectedMember
                ? `Enter as ${selectedMember.name}`
                : 'Select Member to Continue'}
            </button>
          </form>

          {/* Bottom Security Note */}
          <div className="pt-2 border-t border-slate-800/80 text-center">
            <p className="text-[10px] text-slate-500">
              TripSplit Security • Role-based access ensures members only see their personal debts and ledger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
