'use client';

import React, { useState } from 'react';
import { X, Check, Trash2, Plus, Upload, QrCode as QrIcon, Globe, CreditCard, Folder, ExternalLink } from 'lucide-react';
import { Trip, Member } from '@/types';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';

interface TripSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onSaveTrip: (updatedTrip: Trip) => void;
  onClearAllData: () => void;
  onDeleteTrip?: () => void;
}

export function TripSettingsModal({
  isOpen,
  onClose,
  trip,
  onSaveTrip,
  onClearAllData,
  onDeleteTrip,
}: TripSettingsModalProps) {
  const [tripName, setTripName] = useState(trip.name);
  const [destination, setDestination] = useState(trip.destination);
  const [currency, setCurrency] = useState(trip.currency || 'INR');
  const [members, setMembers] = useState<Member[]>(trip.members);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberUpi, setNewMemberUpi] = useState('');
  
  const defaultLead =
    trip.members.find((m) => m.name.toLowerCase().includes('yagnish')) ||
    trip.members.find((m) => m.id === trip.financeLeadId) ||
    trip.members.find((m) => m.isFinanceLead) ||
    trip.members[0] ||
    { id: 'm_lead', name: 'Yagnish Anupam', upiId: '' };

  const [selectedFinanceLeadId, setSelectedFinanceLeadId] = useState<string>(
    defaultLead?.id || trip.members[0]?.id || ''
  );

  // Payment methods
  const [upiId, setUpiId] = useState(
    trip.paymentMethods?.upiId ||
    defaultLead?.upiId ||
    (trip.members.find((m) => m.name.toLowerCase().includes('yagnish'))?.upiId) ||
    ''
  );
  const [paypalUrl, setPaypalUrl] = useState(trip.paymentMethods?.paypalUrl || '');
  const [venmoHandle, setVenmoHandle] = useState(trip.paymentMethods?.venmoHandle || '');
  const [bankDetails, setBankDetails] = useState(trip.paymentMethods?.bankDetails || '');
  const [customQrImage, setCustomQrImage] = useState<string>(
    trip.financeLeadCustomQrImage || trip.paymentMethods?.customQrImage || ''
  );
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>(trip.driveFolderUrl || '');

  if (!isOpen) return null;

  const financeLead = members.find((m) => m.isFinanceLead) || members[0] || { id: 'm_lead', name: 'Finance Lead' };

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
      'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-pink-600',
      'bg-amber-600', 'bg-teal-600', 'bg-indigo-600', 'bg-rose-600',
    ];
    const slug = newMemberName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const newMember: Member = {
      id: `m-${Date.now()}`,
      name: newMemberName.trim(),
      loginId: slug,
      password: `${slug}123`,
      role: 'member',
      upiId: newMemberUpi.trim() || undefined,
      avatarColor: colors[members.length % colors.length],
    };
    setMembers([...members, newMember]);
    setNewMemberName('');
    setNewMemberUpi('');
  };

  const handleDeleteMember = (id: string) => {
    if (members.length <= 1) {
      alert('A trip needs at least 1 member!');
      return;
    }
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleSave = () => {
    const updatedMembers = members.map((m) => {
      const isLead = m.id === selectedFinanceLeadId;
      return {
        ...m,
        isFinanceLead: isLead,
        role: isLead ? ('finance_manager' as const) : m.role === 'finance_manager' ? ('member' as const) : m.role,
        upiId: isLead ? (upiId.trim() || m.upiId) : m.upiId,
      };
    });

    const updated: Trip = {
      ...trip,
      name: tripName.trim() || 'Our Trip Group',
      destination: destination.trim() || 'Worldwide',
      currency,
      financeLeadId: selectedFinanceLeadId,
      driveFolderUrl: driveFolderUrl.trim() || undefined,
      financeLeadCustomQrImage: customQrImage || undefined,
      paymentMethods: {
        upiId: upiId.trim() || undefined,
        paypalUrl: paypalUrl.trim() || undefined,
        venmoHandle: venmoHandle.trim() || undefined,
        bankDetails: bankDetails.trim() || undefined,
        customQrImage: customQrImage || undefined,
      },
      members: updatedMembers,
    };
    onSaveTrip(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-auto max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 touch-manipulation"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 pr-8">
          <span>⚙️</span> Trip & Payment Settings
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure trip details, currency, and receiving payment accounts.
        </p>

        {/* 1. Trip Info & Currency Inputs */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Trip Title *
            </label>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-medium text-slate-900 dark:text-white"
              placeholder="e.g. Tokyo Offsite"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Destination
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-medium text-slate-900 dark:text-white"
              placeholder="e.g. Tokyo, Japan"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Currency *
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-base sm:text-xs font-medium text-slate-900 dark:text-white"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Global Payment Receiving Section */}
        <div className="mt-4 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
              <CreditCard className="h-4 w-4" /> Receiving Payment Methods (Finance Lead)
            </h4>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
              Global Support
            </span>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Designated Finance Manager (FM / Trip Lead) *
            </label>
            <select
              value={selectedFinanceLeadId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedFinanceLeadId(newId);
                const lead = members.find((m) => m.id === newId);
                if (lead?.upiId) setUpiId(lead.upiId);
              }}
              className="w-full rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (@{m.loginId}) {m.name.toLowerCase().includes('yagnish') ? '⭐ [Official FM]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                UPI ID (India)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@okaxis"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-mono font-medium text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PayPal.me Link (Global)
              </label>
              <input
                type="text"
                value={paypalUrl}
                onChange={(e) => setPaypalUrl(e.target.value)}
                placeholder="e.g. paypal.me/yourusername"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-medium text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Venmo / CashApp (US)
              </label>
              <input
                type="text"
                value={venmoHandle}
                onChange={(e) => setVenmoHandle(e.target.value)}
                placeholder="e.g. @yourusername"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-medium text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bank / IBAN / Account Details
              </label>
              <input
                type="text"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                placeholder="e.g. IBAN / Swift / Routing #"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-medium text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Custom QR Code Upload */}
          <div className="pt-2 border-t border-emerald-500/20">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Upload Official QR Code Image (Revolut, GPay, Wise, Zelle, etc.)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-all">
                <Upload className="h-3.5 w-3.5 text-emerald-500" />
                <span className="truncate">
                  {customQrImage ? 'Change QR Image' : 'Pick QR Screenshot'}
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
                  alt="QR Preview"
                  className="h-10 w-10 rounded-lg object-cover border border-slate-300"
                />
                <span className="text-[10px] text-emerald-600 font-bold">
                  ✓ Custom QR Active (Members can scan this in app)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2.5 Google Drive Shared Photos & Memories Folder */}
        <div className="mt-4 rounded-2xl border-2 border-sky-500/30 bg-sky-50/40 dark:bg-sky-950/20 p-3.5 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5 uppercase tracking-wide">
              <Folder className="h-4 w-4 text-sky-500" /> Google Drive Shared Memories Album
            </h4>
            <span className="text-[10px] font-bold text-sky-600 bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 rounded-full">
              Full-Res Media
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            Paste your shared Google Drive folder URL. All 7 friends will see 1-click buttons to upload photos/videos and browse the album.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={driveFolderUrl}
              onChange={(e) => setDriveFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="flex-1 rounded-xl border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-800 px-3 py-2 text-base sm:text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {driveFolderUrl && (
              <a
                href={driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm flex-shrink-0"
                title="Test Open Folder"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Test Link</span>
              </a>
            )}
          </div>
        </div>

        {/* 3. Manage Members List */}
        <div className="mt-4">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
            Trip Members ({members.length})
          </h4>

          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 p-2 text-xs border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-lg text-white text-[9px] font-bold ${m.avatarColor}`}
                  >
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{m.name}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">(@{m.loginId})</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {m.isFinanceLead && (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                      Finance Lead
                    </span>
                  )}
                  {!m.isFinanceLead && (
                    <button
                      onClick={() => handleDeleteMember(m.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Remove Member"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Member inline */}
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Friend / Teammate name"
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-base sm:text-xs bg-white dark:bg-slate-800"
            />
            <button
              type="button"
              onClick={handleAddMember}
              className="flex items-center gap-1 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-2 text-xs font-bold touch-manipulation min-h-[38px]"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>

        {/* 4. Reset Data Section */}
        <div className="mt-5 space-y-2.5">
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-3.5 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                Clear Expenses & Rounds
              </h4>
              <p className="text-[11px] text-slate-500">
                Reset bills & rounds to 0 while keeping members
              </p>
            </div>
            <button
              type="button"
              onClick={onClearAllData}
              className="rounded-xl border border-rose-300 bg-white dark:bg-slate-900 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-700 dark:text-rose-300 px-3 py-2 text-xs font-bold transition-all shadow-sm touch-manipulation min-h-[36px]"
            >
              Reset to 0
            </button>
          </div>

          {onDeleteTrip && (
            <div className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-100/50 dark:bg-rose-950/40 p-3.5 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Delete Entire Trip Group
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Permanently wipe this trip from cloud and start completely fresh
                </p>
              </div>
              <button
                type="button"
                onClick={onDeleteTrip}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 text-xs font-bold transition-all shadow-sm flex items-center gap-1 touch-manipulation min-h-[36px]"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Trip
              </button>
            </div>
          )}
        </div>

        {/* 5. Save button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 touch-manipulation min-h-[44px]"
          >
            <Check className="h-4 w-4" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
