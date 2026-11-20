'use client';

import React, { useState, useEffect } from 'react';
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
  Globe,
  ArrowRight,
  KeyRound,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { Member, Trip } from '@/types';
import { saveSession } from '@/lib/session';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '@/lib/currency';
import { createNewTripTemplate } from '@/lib/mockData';
import { findTripByCodeOrId } from '@/lib/tripService';

interface LoginScreenProps {
  trip: Trip;
  onLoggedIn: () => void;
  onUpdateTrip?: (updatedTrip: Trip) => void;
  onSelectTrip?: (tripId: string) => void;
}

export function LoginScreen({ trip, onLoggedIn, onUpdateTrip, onSelectTrip }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'create_trip' | 'find_trip'>(
    trip.members.length === 0 ? 'create_trip' : 'login'
  );

  // Login form state
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Create Trip form state
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerLoginId, setOrganizerLoginId] = useState('');
  const [organizerPassword, setOrganizerPassword] = useState('');
  const [paymentType, setPaymentType] = useState<'upi' | 'paypal' | 'venmo' | 'bank' | 'none'>('upi');
  const [paymentValue, setPaymentValue] = useState('');

  // Find Trip by Code state
  const [searchCode, setSearchCode] = useState('');

  // Auto-generate slug for login ID
  const handleNameChange = (val: string) => {
    setOrganizerName(val);
    if (!organizerLoginId || organizerLoginId === organizerName.toLowerCase().replace(/\s+/g, '')) {
      setOrganizerLoginId(val.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  };

  // ── Member Login Handler ──
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedId = loginId.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedId || !trimmedPass) {
      setErrorMsg('Please enter both Login ID and Password');
      return;
    }

    if (!trip.members || trip.members.length === 0) {
      setErrorMsg('This trip group has no members yet. Please create a new trip or ask the organizer.');
      return;
    }

    // Match member by loginId, name, or phone
    const found = trip.members.find(
      (m) =>
        m.loginId?.toLowerCase() === trimmedId ||
        m.name?.toLowerCase() === trimmedId ||
        m.phone === trimmedId
    );

    if (!found) {
      setErrorMsg(`No member found with Login ID "${trimmedId}" in "${trip.name}". Ask your Trip Manager for your credentials.`);
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

  // ── Create New Trip Handler ──
  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!tripName.trim() || !organizerName.trim() || !organizerLoginId.trim() || !organizerPassword.trim()) {
      setErrorMsg('Please complete all required fields (*)');
      return;
    }

    const paymentMethods = paymentType !== 'none' && paymentValue.trim()
      ? {
          upiId: paymentType === 'upi' ? paymentValue.trim() : undefined,
          paypalUrl: paymentType === 'paypal' ? paymentValue.trim() : undefined,
          venmoHandle: paymentType === 'venmo' ? paymentValue.trim() : undefined,
          bankDetails: paymentType === 'bank' ? paymentValue.trim() : undefined,
        }
      : undefined;

    const newTrip = createNewTripTemplate({
      name: tripName.trim(),
      destination: destination.trim() || 'Worldwide',
      currency,
      managerName: organizerName.trim(),
      managerLoginId: organizerLoginId.trim().toLowerCase(),
      managerPassword: organizerPassword.trim(),
      paymentMethods,
    });

    if (onUpdateTrip) {
      onUpdateTrip(newTrip);
    }

    // Auto login as organizer
    const admin = newTrip.members[0];
    if (admin) {
      saveSession({
        memberId: admin.id,
        tripId: newTrip.id,
        role: admin.role || 'finance_manager',
      });
    }

    onLoggedIn();
  };

  // ── Find Trip by Code Handler ──
  const handleFindTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const code = searchCode.trim();
    if (!code) {
      setErrorMsg('Please enter a Trip Code or ID');
      return;
    }

    setIsLoading(true);
    try {
      const foundTrip = await findTripByCodeOrId(code);
      if (foundTrip) {
        if (onUpdateTrip) onUpdateTrip(foundTrip);
        if (onSelectTrip) onSelectTrip(foundTrip.id);
        setMode('login');
        setErrorMsg('');
      } else {
        setErrorMsg(`Trip with code "${code}" not found. Please double-check with your organizer.`);
      }
    } catch {
      setErrorMsg('Failed to lookup trip. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const currencySymbol = getCurrencySymbol(trip.currency);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-2xl text-2xl font-black mb-3">
            {currencySymbol}
          </div>
          <div className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 text-[11px] font-bold text-emerald-300 mb-2">
            Trip & Team Finance Portal
          </div>
          
          {mode === 'login' ? (
            <>
              <h1 className="text-2xl font-black text-white tracking-tight">{trip.name}</h1>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                <MapPin className="h-3 w-3 text-emerald-400" />
                <span>{trip.destination}</span>
                <span>•</span>
                <span>Currency: {trip.currency || 'INR'} ({currencySymbol})</span>
                <span>•</span>
                <span>{trip.members.length} Member{trip.members.length === 1 ? '' : 's'}</span>
              </p>
              {trip.inviteCode && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 px-2.5 py-0.5 text-[10px] text-slate-300 font-mono">
                  <span>Trip Code:</span>
                  <strong className="text-emerald-400">{trip.inviteCode}</strong>
                </div>
              )}
            </>
          ) : mode === 'create_trip' ? (
            <>
              <h1 className="text-2xl font-black text-white tracking-tight">Create a New Trip</h1>
              <p className="text-xs text-slate-400 mt-1">
                For friends, families, vacations, and remote team offsites worldwide.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-black text-white tracking-tight">Join Your Team Trip</h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter the Trip Code shared by your trip organizer.
              </p>
            </>
          )}
        </div>

        {/* ── MODE 1: CREATE TRIP ── */}
        {mode === 'create_trip' && (
          <div className="rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Trip & Group Setup
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Set up your trip name, currency, and your organizer credentials.
              </p>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Trip / Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="e.g. Swiss Alps Retreat, Tokyo Tour, Goa 2026"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Zermatt, Tokyo, Goa"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Currency *
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2.5">
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">
                  Your Organizer / Manager Account
                </p>
                <div>
                  <label className="text-xs text-slate-300 block mb-0.5">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={organizerName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Alex Johnson, Priya, David"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-300 block mb-0.5">Your Login ID *</label>
                    <input
                      type="text"
                      required
                      value={organizerLoginId}
                      onChange={(e) => setOrganizerLoginId(e.target.value)}
                      placeholder="e.g. alex"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-0.5">Your Password *</label>
                    <input
                      type="text"
                      required
                      value={organizerPassword}
                      onChange={(e) => setOrganizerPassword(e.target.value)}
                      placeholder="e.g. alex123"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="text-xs text-slate-300 block font-medium">
                  Receiving Payment Method (Optional)
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                  {(['upi', 'paypal', 'venmo', 'bank'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPaymentType(type)}
                      className={`py-1.5 rounded-lg border font-bold uppercase transition-all ${
                        paymentType === type
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {paymentType !== 'none' && (
                  <input
                    type="text"
                    value={paymentValue}
                    onChange={(e) => setPaymentValue(e.target.value)}
                    placeholder={
                      paymentType === 'upi'
                        ? 'e.g. yourname@okaxis'
                        : paymentType === 'paypal'
                        ? 'e.g. paypal.me/yourname'
                        : paymentType === 'venmo'
                        ? 'e.g. @yourname'
                        : 'e.g. IBAN / Swift / Account details'
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
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
                Launch Trip Portal
              </button>

              <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                {trip.members.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMsg(''); }}
                    className="hover:text-white"
                  >
                    ← Back to Sign In
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setMode('find_trip'); setErrorMsg(''); }}
                  className="hover:text-emerald-400 ml-auto"
                >
                  Join existing trip with code →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── MODE 2: FIND TRIP BY CODE ── */}
        {mode === 'find_trip' && (
          <div className="rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Compass className="h-4 w-4 text-emerald-400" />
                Find Trip Group
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter your team's Trip Code or ID to load the portal.
              </p>
            </div>

            <form onSubmit={handleFindTrip} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Trip Code or ID *
                </label>
                <input
                  type="text"
                  required
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="e.g. TOKYO26, SWISS84, or trip_..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                />
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-rose-950/60 border border-rose-800/80 p-2.5 text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-98 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Searching...</span>
                ) : (
                  <>
                    <span>Load Trip Group</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); }}
                  className="hover:text-white"
                >
                  ← Back to Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('create_trip'); setErrorMsg(''); }}
                  className="hover:text-emerald-400"
                >
                  Create new trip +
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── MODE 3: MEMBER SIGN IN ── */}
        {mode === 'login' && (
          <div className="rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-400" />
                Member Sign In
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter your Login ID and Password provided by your Trip Manager.
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
                  placeholder="e.g. your login ID"
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

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => { setMode('create_trip'); setErrorMsg(''); }}
                className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Create New Trip
              </button>
              <button
                type="button"
                onClick={() => { setMode('find_trip'); setErrorMsg(''); }}
                className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Compass className="h-3.5 w-3.5" />
                Enter Trip Code
              </button>
            </div>

            {/* Privacy Footnote */}
            <div className="text-center pt-1">
              <p className="text-[10px] text-slate-500 leading-tight">
                🔒 Protected Privacy: Members only see their own dues and splits. Only the Finance Manager sees all financial totals.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
