'use client';

import React, { useState } from 'react';
import { Trip, Expense } from '@/types';
import { formatMoney } from '@/lib/currency';
import {
  Fuel,
  Car,
  Gauge,
  Receipt,
  Plus,
  CheckCircle2,
  Users,
  Sparkles,
  Calculator,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';

interface FuelTollCalculatorProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
}

const VEHICLE_PRESETS: { label: string; icon: string; mileage: number }[] = [
  { label: 'Bike', icon: '🏍️', mileage: 35 },
  { label: 'Hatchback', icon: '🚗', mileage: 18 },
  { label: 'Sedan', icon: '🚙', mileage: 15 },
  { label: 'SUV / Innova', icon: '🚐', mileage: 12 },
  { label: 'Mini Bus', icon: '🚌', mileage: 8 },
];

export function FuelTollCalculator({ trip, onUpdateTrip }: FuelTollCalculatorProps) {
  // Inputs
  const [distanceKm, setDistanceKm] = useState<number>(450); // e.g. Talcher <-> Bhubaneswar <-> Puri roundtrip
  const [mileageKmPerL, setMileageKmPerL] = useState<number>(14);
  const [fuelPricePerL, setFuelPricePerL] = useState<number>(103); // Petrol rate in Odisha
  const [fuelType, setFuelType] = useState<'petrol' | 'diesel' | 'custom'>('petrol');
  const [tollCharges, setTollCharges] = useState<number>(480); // Toll plazas along NH16 / marine drive
  const [parkingCharges, setParkingCharges] = useState<number>(200);
  const [travelerCount, setTravelerCount] = useState<number>(trip.members.length || 7);

  const [loggedStatus, setLoggedStatus] = useState<string | null>(null);

  // Calculations
  const fuelLitersNeeded = distanceKm > 0 && mileageKmPerL > 0 ? distanceKm / mileageKmPerL : 0;
  const totalFuelCost = Math.round(fuelLitersNeeded * fuelPricePerL);
  const totalTollsAndParking = Number(tollCharges || 0) + Number(parkingCharges || 0);
  const totalTripHighwayCost = totalFuelCost + totalTollsAndParking;
  const costPerPerson = travelerCount > 0 ? Math.round((totalTripHighwayCost / travelerCount) * 100) / 100 : 0;

  const handleSelectFuelType = (type: 'petrol' | 'diesel') => {
    setFuelType(type);
    if (type === 'petrol') setFuelPricePerL(103);
    if (type === 'diesel') setFuelPricePerL(94);
  };

  const handleLogAsTripBill = () => {
    if (totalTripHighwayCost <= 0) return;

    const lead =
      trip.members.find((m) => m.isFinanceLead) ||
      trip.members.find((m) => m.name.toLowerCase().includes('yagnish')) ||
      trip.members[0];

    // Build equal splits
    const participatingMembers = trip.members.slice(0, travelerCount);
    const equalShare = Math.round((totalTripHighwayCost / participatingMembers.length) * 100) / 100;
    const splits = participatingMembers.map((m) => ({
      memberId: m.id,
      amount: equalShare,
    }));

    const newExpense: Expense = {
      id: `exp_fuel_${Date.now()}`,
      tripId: trip.id,
      title: `Fuel & Tolls (${distanceKm} km Highway Drive)`,
      amount: totalTripHighwayCost,
      category: 'fuel',
      paidBy: lead?.id || trip.financeLeadId,
      paidAt: new Date().toISOString().split('T')[0],
      splitType: 'equal',
      splits,
      notes: `Estimated distance: ${distanceKm} km @ ${mileageKmPerL} km/L. Fuel: ${formatMoney(totalFuelCost, trip.currency)}, Fastag/Tolls: ${formatMoney(tollCharges, trip.currency)}, Parking: ${formatMoney(parkingCharges, trip.currency)}.`,
    };

    const updatedTrip: Trip = {
      ...trip,
      expenses: [newExpense, ...trip.expenses],
    };

    onUpdateTrip(updatedTrip);
    setLoggedStatus(`Logged ${formatMoney(totalTripHighwayCost, trip.currency)} highway bill to Trip Bills!`);
    setTimeout(() => setLoggedStatus(null), 5000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Highway Fuel & Toll Split Calculator
            </h2>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Live Split
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Calculate mileage, fuel consumption, Fastag highway tolls, and log directly into your group bill ledger
          </p>
        </div>
      </div>

      {loggedStatus && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{loggedStatus}</span>
        </div>
      )}

      {/* Main Grid: Inputs on Left, Real-Time Result on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Inputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. Distance & Vehicle Type */}
          <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-purple-500" />
                <span>1. Distance & Vehicle Mileage</span>
              </span>
              <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                {distanceKm} km
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                Total Route Distance (km):
              </label>
              <input
                type="number"
                min="1"
                value={distanceKm || ''}
                onChange={(e) => setDistanceKm(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                placeholder="e.g. 450"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[150, 250, 450, 600].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDistanceKm(d)}
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  >
                    {d} km
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Mileage Preset Buttons */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                Vehicle Type & Mileage ({mileageKmPerL} km/L):
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {VEHICLE_PRESETS.map((v) => {
                  const isSelected = mileageKmPerL === v.mileage;
                  return (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => setMileageKmPerL(v.mileage)}
                      className={`p-2 rounded-xl text-center border transition-all touch-manipulation min-h-[44px] flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-500 shadow-xs font-black'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-sm">{v.icon}</span>
                      <span className="text-[10px] font-bold mt-0.5">{v.label}</span>
                      <span className="text-[9px] opacity-80">{v.mileage} km/L</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Fuel Type & Price */}
          <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs">
            <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Fuel className="h-4 w-4 text-purple-500" />
              <span>2. Fuel Type & Current Rate</span>
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectFuelType('petrol')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all touch-manipulation min-h-[40px] flex items-center justify-center gap-2 ${
                  fuelType === 'petrol'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-xs font-black'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>⛽ Petrol (~₹103/L)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFuelType('diesel')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all touch-manipulation min-h-[40px] flex items-center justify-center gap-2 ${
                  fuelType === 'diesel'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-xs font-black'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>🛢️ Diesel (~₹94/L)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                Rate (₹/L):
              </label>
              <input
                type="number"
                min="1"
                value={fuelPricePerL || ''}
                onChange={(e) => {
                  setFuelType('custom');
                  setFuelPricePerL(Number(e.target.value));
                }}
                className="w-32 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-bold p-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-mono"
              />
            </div>
          </div>

          {/* 3. Fastag Tolls & Parking */}
          <div className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs">
            <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-purple-500" />
              <span>3. Fastag Tolls & Parking</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Fastag Highway Tolls (₹):
                </label>
                <input
                  type="number"
                  min="0"
                  value={tollCharges || ''}
                  onChange={(e) => setTollCharges(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                  placeholder="e.g. 480"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Beach & Temple Parking (₹):
                </label>
                <input
                  type="number"
                  min="0"
                  value={parkingCharges || ''}
                  onChange={(e) => setParkingCharges(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                  placeholder="e.g. 200"
                />
              </div>
            </div>

            {/* Traveler count selector */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-purple-500" />
                <span>Split among travelers:</span>
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={trip.members.length || 20}
                  value={travelerCount}
                  onChange={(e) => setTravelerCount(Math.max(1, Number(e.target.value)))}
                  className="w-16 bg-slate-100 dark:bg-slate-800 text-center font-black p-1 rounded-lg border border-slate-300 dark:border-slate-600 outline-none"
                />
                <span className="text-[11px] text-slate-500 font-bold">friends</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Summary Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 rounded-3xl border border-purple-200/80 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/60 via-white to-pink-50/40 dark:from-purple-950/30 dark:via-slate-900 dark:to-pink-950/20 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Split Breakdown
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                {travelerCount} travelers
              </span>
            </div>

            {/* Big Per-Person Cost */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md text-center space-y-0.5">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-purple-200">
                Each Friend Pays
              </span>
              <div className="text-3xl sm:text-4xl font-black tracking-tight">
                {formatMoney(costPerPerson, trip.currency)}
              </div>
              <span className="text-[10px] text-purple-200">
                for full {distanceKm} km roundtrip
              </span>
            </div>

            {/* Line Items */}
            <div className="space-y-2 text-xs font-semibold">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Fuel Required:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {fuelLitersNeeded.toFixed(1)} Liters
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Fuel Amount:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatMoney(totalFuelCost, trip.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Fastag Highway Tolls:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatMoney(tollCharges || 0, trip.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Parking & Misc:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatMoney(parkingCharges || 0, trip.currency)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm font-black text-slate-900 dark:text-white">
                <span>Total Roadtrip Cost:</span>
                <span className="font-mono text-purple-600 dark:text-purple-400">
                  {formatMoney(totalTripHighwayCost, trip.currency)}
                </span>
              </div>
            </div>

            {/* 1-Click Action to Log as Group Bill */}
            <button
              type="button"
              onClick={handleLogAsTripBill}
              disabled={totalTripHighwayCost <= 0}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black bg-purple-600 hover:bg-purple-700 active:scale-98 text-white shadow-md shadow-purple-600/25 transition-all touch-manipulation min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              <span>Log {formatMoney(totalTripHighwayCost, trip.currency)} as Trip Bill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
