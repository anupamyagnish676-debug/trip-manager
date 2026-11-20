'use client';

import React, { useState } from 'react';
import { X, RefreshCw, Sparkles, Check, Trash2, Plus, Upload, QrCode as QrIcon } from 'lucide-react';
import { Trip, Member } from '@/types';

interface TripSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onSaveTrip: (updatedTrip: Trip) => void;
  onClearAllData: () => void;
}

export function TripSettingsModal({
  isOpen,
  onClose,
  trip,
  onSaveTrip,
  onClearAllData,
}: TripSettingsModalProps) {
  const [tripName, setTripName] = useState(trip.name);
  const [destination, setDestination] = useState(trip.destination);
  const [members, setMembers] = useState<Member[]>(trip.members);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberUpi, setNewMemberUpi] = useState('');
  const [customQrImage, setCustomQrImage] = useState<string>(
    trip.financeLeadCustomQrImage || ''
  );

  if (!isOpen) return null;

  const financeLead = members.find((m) => m.isFinanceLead) || members[0];

  const handleUpdateMember = (id: string, field: 'name' | 'upiId' | 'phone', val: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Please choose an image under 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomQrImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const colors = [
      'bg-emerald-600',
      'bg-blue-600',
      'bg-purple-600',
      'bg-pink-600',
      'bg-amber-600',
      'bg-teal-600',
      'bg-indigo-600',
      'bg-rose-600',
      'bg-cyan-600',
      'bg-orange-600',
    ];
    const newMember: Member = {
      id: `m-${Date.now()}`,
      name: newMemberName.trim(),
      upiId: newMemberUpi.trim() || undefined,
      avatarColor: colors[members.length % colors.length],
    };
    setMembers([...members, newMember]);
    setNewMemberName('');
    setNewMemberUpi('');
  };

  const handleDeleteMember = (id: string) => {
    if (members.length <= 2) {
      alert('A trip needs at least 2 members!');
      return;
    }
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleSave = () => {
    const updated: Trip = {
      ...trip,
      name: tripName.trim() || 'My Vacation Trip',
      destination: destination.trim() || 'Vacation',
      financeLeadCustomQrImage: customQrImage || undefined,
      members,
    };
    onSaveTrip(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>⚙️</span> Trip Settings & QR Configuration
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Set your real receiving UPI ID and optionally upload a screenshot of your official bank QR
        </p>

        {/* 1. Finance Lead Receiving QR & UPI ID Section */}
        <div className="mt-4 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
              <QrIcon className="h-4 w-4" /> Money Receiving Details (Your QR)
            </h4>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
              Finance Lead
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Real UPI ID (VPA) *
              </label>
              <input
                type="text"
                value={financeLead.upiId || ''}
                onChange={(e) => handleUpdateMember(financeLead.id, 'upiId', e.target.value)}
                placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Any dynamic QR generated will pay directly into this UPI ID.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Upload Real QR Screenshot (Optional)
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-all">
                  <Upload className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="truncate">
                    {customQrImage ? 'Change QR Image' : 'Pick Screenshot'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {customQrImage && (
                  <button
                    type="button"
                    onClick={() => setCustomQrImage('')}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                    title="Remove custom QR"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {customQrImage && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={customQrImage}
                    alt="Preview"
                    className="h-10 w-10 rounded-lg object-cover border border-slate-300"
                  />
                  <span className="text-[10px] text-emerald-600 font-bold">
                    ✓ Custom Bank QR Active
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Trip Info Inputs */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Trip Title
            </label>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white"
              placeholder="e.g. Winter Vacation 2026"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Destination
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white"
              placeholder="e.g. Manali, Goa, Kasol"
            />
          </div>
        </div>

        {/* 3. Members List */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Trip Members ({members.length} friends):
          </label>
          <div className="max-h-44 overflow-y-auto space-y-2 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-950">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-xs">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-white font-bold text-[10px] ${m.avatarColor}`}
                >
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => handleUpdateMember(m.id, 'name', e.target.value)}
                  placeholder="Friend Name"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={m.upiId || ''}
                  onChange={(e) => handleUpdateMember(m.id, 'upiId', e.target.value)}
                  placeholder="UPI ID (optional)"
                  className="w-32 rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-mono bg-white dark:bg-slate-800"
                />
                {!m.isFinanceLead && (
                  <button
                    onClick={() => handleDeleteMember(m.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Member inline */}
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="New friend name"
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={newMemberUpi}
              onChange={(e) => setNewMemberUpi(e.target.value)}
              placeholder="UPI ID"
              className="w-32 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-800"
            />
            <button
              type="button"
              onClick={handleAddMember}
              className="flex items-center gap-1 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5 text-xs font-bold"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>

        {/* 4. Clear Data / Wipe Demo Section */}
        <div className="mt-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-3.5 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
              Clear Demo Expenses & Payments
            </h4>
            <p className="text-[11px] text-slate-500">
              Wipe out the sample bills so your trip starts fresh from ₹0
            </p>
          </div>
          <button
            type="button"
            onClick={onClearAllData}
            className="rounded-xl border border-rose-300 bg-white dark:bg-slate-900 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-700 dark:text-rose-300 px-3 py-1.5 text-xs font-bold transition-all shadow-sm"
          >
            Start Fresh (₹0)
          </button>
        </div>

        {/* 5. Save button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Check className="h-4 w-4" /> Save Settings & Update QR
          </button>
        </div>
      </div>
    </div>
  );
}
