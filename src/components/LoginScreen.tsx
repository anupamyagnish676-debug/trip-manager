'use client';

import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  MapPin,
  Sparkles,
  PlusCircle,
  Users,
} from 'lucide-react';
import { Member, Trip } from '@/types';
import { saveSession } from '@/lib/session';

interface LoginScreenProps {
  trip: Trip;
  onLoggedIn: () => void;
  onUpdateTrip?: (updatedTrip: Trip) => void;
}

export function LoginScreen({ trip, onLoggedIn, onUpdateTrip }: LoginScreenProps) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // First-time setup wizard (if no members or manager wants to start a new trip)
  const [showSetupTrip, setShowSetupTrip] = useState(trip.members.length === 0);
  const [newTripName, setNewTripName] = useState(trip.name || 'Our Vacation 2026');
  const [newDestination, setNewDestination] = useState(trip.destination || 'Goa');
  const [managerName, setManagerName] = useState('Anupam');
  const [managerLoginId, setManagerLoginId] = useState('anupam');
  const [managerPassword, setManagerPassword] = useState('password123');
  const [managerUpi, setManagerUpi] = useState('');

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

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName.trim() || !managerName.trim() || !managerLoginId.trim() || !managerPassword.trim()) {
      setErrorMsg('Please fill in all required setup fields');
      return;
    }

    const adminMember: Member = {
      id: `m_${Date.now()}`,
      name: managerName.trim(),
      loginId: managerLoginId.trim().toLowerCase(),
      password: managerPassword.trim(),
      role: 'finance_manager',
      isFinanceLead: true,
      upiId: managerUpi.trim() || undefined,
      phone: '',
      avatarColor: 'bg-emerald-600',
      specialty: 'none',
      pin: '1234',
    };

    const newTrip: Trip = {
      id: `trip_${Date.now()}`,
      name: newTripName.trim(),
      destination: newDestination.trim() || 'Vacation',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      financeLeadId: adminMember.id,
      inviteCode: 'TRIP2026',
      createdAt: new Date().toISOString(),
      members: [adminMember],
      expenses: [],
      payments: [],
      settlements: [],
      collectionRounds: [],
    };

    if (onUpdateTrip) {
      onUpdateTrip(newTrip);
    }

    // Auto login
    saveSession({
      memberId: adminMember.id,
      tripId: newTrip.id,
      role: 'finance_manager',
    });

    onLoggedIn();
  };

  const isInitialSingleAdmin =
    trip.members.length === 1 &&
    trip.members[0].loginId === 'anupam' &&
    trip.members[0].password === 'password123';

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
            <span>{trip.members.length} Group Member{trip.members.length === 1 ? '' : 's'}</span>
          </p>
        </div>

        {/* Setup New Trip Form (if requested or no members) */}
        {showSetupTrip ? (
          <div className="rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Setup Your Trip Group
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Create a fresh trip with zero mock data. You will be set as Trip & Finance Manager.
              </p>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Trip Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                  placeholder="e.g. Goa Trip 2026, Ladakh Tour"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  placeholder="e.g. Goa, India"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800">
                <p className="text-[11px] font-bold text-emerald-400 mb-2 uppercase tracking-wide">
                  Your Manager Account
                </p>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-xs text-slate-300 block mb-0.5">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="e.g. Anupam"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-300 block mb-0.5">Login ID *</label>
                      <input
                        type="text"
                        required
                        value={managerLoginId}
                        onChange={(e) => setManagerLoginId(e.target.value)}
                        placeholder="anupam"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 block mb-0.5">Password *</label>
                      <input
                        type="text"
                        required
                        value={managerPassword}
                        onChange={(e) => setManagerPassword(e.target.value)}
                        placeholder="password123"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-0.5">Receiving UPI ID (Optional)</label>
                    <input
                      type="text"
                      value={managerUpi}
                      onChange={(e) => setManagerUpi(e.target.value)}
                      placeholder="e.g. yourname@okaxis"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-rose-950/60 border border-rose-800/80 p-2.5 text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-98 mt-2"
              >
                <Sparkles className="h-4 w-4" />
                Create Trip & Enter Portal
              </button>

              {trip.members.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSetupTrip(false)}
                  className="w-full text-center text-xs text-slate-400 hover:text-white pt-1"
                >
                  ← Back to Member Sign In
                </button>
              )}
            </form>
          </div>
        ) : (
          /* Main Login Card */
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
                  placeholder="Enter your assigned login ID"
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

            {/* Quick helper for first-time Manager login */}
            {isInitialSingleAdmin && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setLoginId('anupam');
                    setPassword('password123');
                    setErrorMsg('');
                  }}
                  className="w-full flex items-center justify-between rounded-xl bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-800/50 p-2.5 text-left text-xs text-emerald-300 transition-all"
                >
                  <span className="font-semibold">🔑 Initial Manager Login:</span>
                  <span className="font-mono bg-emerald-900/60 px-2 py-0.5 rounded text-[11px] font-bold text-white">
                    anupam / password123 (Tap to Fill)
                  </span>
                </button>
              </div>
            )}

            {/* Setup link */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => setShowSetupTrip(true)}
                className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Setup New Trip
              </button>
              <span className="text-slate-500">
                {trip.members.length} registered member{trip.members.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Privacy Footnote */}
            <div className="text-center pt-1">
              <p className="text-[10px] text-slate-500 leading-tight">
                🔒 Privacy Protected: Regular members only see their own pending dues and splits. Only the Finance Manager sees all group financial totals.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
