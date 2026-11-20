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
  // Check if URL has direct trip code/id parameter (e.g. invite links)
  const [hasDirectTripLink] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return Boolean(params.get('trip') || params.get('code'));
    }
    return false;
  });

  const [mode, setMode] = useState<'enter_code' | 'login' | 'create_trip'>(
    hasDirectTripLink && trip.members && trip.members.length > 0 ? 'login' : 'enter_code'
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
    const code = searchCode.trim().toUpperCase();
    if (!code) {
      setErrorMsg('Please enter a Trip Code');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Check if the currently loaded trip already matches this code or ID
      const currentMatches =
        (trip.inviteCode && trip.inviteCode.trim().toUpperCase() === code) ||
        trip.id.trim().toUpperCase() === code;

      if (currentMatches && trip.members && trip.members.length > 0) {
        setMode('login');
        setErrorMsg('');
        setIsLoading(false);
        return;
      }

      // 2. Search database / Supabase
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
        <div className="text-center mb-5">
          {mode === 'login' ? (
            <>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-2xl text-2xl font-black mb-3">
                {currencySymbol}
              </div>
              <div className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 text-[11px] font-bold text-emerald-300 mb-2">
                Trip Expense & Split Portal
              </div>
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
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-2xl text-2xl font-black mb-3">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 text-[11px] font-bold text-emerald-300 mb-2">
                Trip Expense & Split Portal
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Create a New Trip</h1>
              <p className="text-xs text-slate-400 mt-1">
                For friends, families, vacations, and remote team offsites worldwide.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-2xl text-2xl font-black mb-3">
                <Compass className="h-7 w-7 text-white" />
              </div>
              <div className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 text-[11px] font-bold text-emerald-300 mb-2">
                Trip Expense & Split Portal
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Enter Trip Code</h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter your 6-character code (e.g. ODISHA71) to open your group trip.
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
                <button
                  type="button"
                  onClick={() => { setMode('enter_code'); setErrorMsg(''); }}
                  className="hover:text-white"
                >
                  ← Back to Trip Code
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('enter_code'); setErrorMsg(''); }}
                  className="hover:text-emerald-400 ml-auto"
                >
                  Join existing trip with code →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 1: ENTER TRIP CODE ── */}
        {mode === 'enter_code' && (
          <div className="rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-emerald-400" />
                Trip Access Verification
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter the Trip Code shared by your friend or organizer.
              </p>
            </div>

            <form onSubmit={handleFindTrip} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Trip Code *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ODISHA71"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg font-mono font-bold tracking-widest text-emerald-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase text-center"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                  Case-insensitive (e.g. <span className="font-mono text-slate-400">ODISHA71</span>)
                </p>
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-rose-950/60 border border-rose-800/80 p-3 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-98 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Finding Trip...
                  </span>
                ) : (
                  <>
                    <span>Continue to Member Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-800/80 text-center">
                <p className="text-[11px] text-slate-400 mb-2">
                  Starting a new trip or group?
                </p>
                <button
                  type="button"
                  onClick={() => { setMode('create_trip'); setErrorMsg(''); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 py-2.5 text-xs font-semibold text-slate-200 transition-colors"
                >
                  <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Create a New Trip</span>
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

            {/* Quick Profile Selection */}
            {trip.members && trip.members.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 block">
                  Select your profile:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {trip.members.map((m) => {
                    const isSelected = loginId.toLowerCase() === (m.loginId || '').toLowerCase();
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setLoginId(m.loginId || m.name.toLowerCase().replace(/\s+/g, ''));
                          setErrorMsg('');
                        }}
                        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700/60'
                        }`}
                      >
                        <span className={`h-5 w-5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${m.avatarColor}`}>
                          {m.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span>{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                  <span className="text-[10px] text-slate-500">Your account password</span>
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

            {/* Privacy Footnote */}
            <div className="text-center pt-2 border-t border-slate-800/80">
              <p className="text-[10px] text-slate-500 leading-tight">
                🔒 Live group expense tracking with instant UPI settlement for all friends.
              </p>
            </div>
          </div>
        )}

        {/* Clean, elegant footer links outside the card */}
        {mode === 'login' && (
          <div className="mt-5 space-y-3 text-center">
            <button
              type="button"
              onClick={() => { setMode('enter_code'); setErrorMsg(''); }}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Enter a different Trip Code
            </button>

            <div className="pt-2 border-t border-slate-800/50 flex flex-col items-center gap-2 text-xs text-slate-500">
              <p>Starting a new trip or joining another group?</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setMode('create_trip'); setErrorMsg(''); }}
                  className="hover:text-emerald-400 font-semibold transition-colors flex items-center gap-1.5 text-slate-400 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800"
                >
                  <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Create a New Trip</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('enter_code'); setErrorMsg(''); }}
                  className="hover:text-sky-400 font-semibold transition-colors flex items-center gap-1.5 text-slate-400 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800"
                >
                  <Compass className="h-3.5 w-3.5 text-sky-400" />
                  <span>Join with Code</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
