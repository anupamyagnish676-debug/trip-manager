'use client';

import React, { useState, useEffect } from 'react';
import { Trip, ItineraryActivity } from '@/types';
import {
  Sparkles,
  Compass,
  MapPin,
  Clock,
  ShieldAlert,
  Plus,
  Check,
  Navigation,
  Utensils,
  Sun,
  CloudRain,
  Users,
  Flame,
  ArrowRight,
  Info,
  X,
  RotateCcw,
  Key,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react';
import {
  generateGeminiItinerary,
  getGeminiWhatNext,
  getGeminiHiddenGems,
  chatWithGeminiGuide,
  getStoredGeminiApiKey,
  GeneratedItineraryResponse,
  WhatNextResponse,
  HiddenGemsResponse,
} from '@/lib/geminiService';
import { GeminiApiKeyModal } from './GeminiApiKeyModal';

interface ItineraryAiCopilotProps {
  trip: Trip;
  activeDayNumber: number;
  onAddActivitiesToDay: (dayNumber: number, activities: ItineraryActivity[]) => void;
  onClose?: () => void;
}

interface DraftActivity {
  time: string;
  title: string;
  location: string;
  notes: string;
  dressCodeOrTips?: string;
}

const PRESET_VIBES = [
  { id: 'temple_beach', label: 'Puri Sacred Temples & Beach', hint: 'Jagannath darshan, Anandabazar Mahaprasad, Golden Beach sunset' },
  { id: 'marine_drive', label: 'Konark Marine Drive & Sun Temple', hint: 'Coastal highway cruise, 13th-century Sun Temple, Chandrabhaga beach' },
  { id: 'chilika_nature', label: 'Chilika Lake & Satapada Dolphins', hint: 'Scenic boat ride, Irrawaddy dolphins, fresh coastal crab fry' },
  { id: 'food_dhaba', label: 'Highway Dhabas & Seafood Crawl', hint: 'Authentic Dalma, Chhena Poda, highway seafood dhabas, Pipili crafts' },
];

export function ItineraryAiCopilot({
  trip,
  activeDayNumber,
  onAddActivitiesToDay,
  onClose,
}: ItineraryAiCopilotProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'pivot' | 'gems' | 'chat'>('generate');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  // ── Tab 1: Itinerary Generation State ──
  const [selectedVibe, setSelectedVibe] = useState(PRESET_VIBES[0]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [targetDay, setTargetDay] = useState<number>(activeDayNumber || 1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedItineraryResponse | null>(null);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // ── Tab 2: What Next (Emergency Pivot) State ──
  const [pivotLocation, setPivotLocation] = useState(trip.destination || 'Puri Beach');
  const [pivotReason, setPivotReason] = useState('Spot is overly crowded with long lines');
  const [isPivoting, setIsPivoting] = useState(false);
  const [pivotResult, setPivotResult] = useState<WhatNextResponse | null>(null);

  // ── Tab 3: Hidden Gems State ──
  const [isFetchingGems, setIsFetchingGems] = useState(false);
  const [gemsResult, setGemsResult] = useState<HiddenGemsResponse | null>(null);

  // ── Tab 4: Chat with Gemini State ──
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    {
      role: 'model',
      text: `Namaste! I am your Gemini travel copilot for ${trip.destination || 'Odisha'}. Ask me about temple dress codes, best times to avoid crowds, hidden dhabas, or route driving times!`,
    },
  ]);
  const [isChatting, setIsChatting] = useState(false);

  useEffect(() => {
    const key = getStoredGeminiApiKey();
    setHasApiKey(Boolean(key));
  }, []);

  const refreshKeyStatus = () => {
    const key = getStoredGeminiApiKey();
    setHasApiKey(Boolean(key));
  };

  // ── Action 1: Generate Itinerary with Gemini ──
  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setGenError(null);
    setAddedSuccess(false);

    try {
      const plan = await generateGeminiItinerary({
        destination: trip.destination || 'Puri & Konark, Odisha',
        tripName: trip.name,
        dayNumber: targetDay,
        members: trip.members.map((m) => ({ id: m.id, name: m.name })),
        preferences: selectedVibe.hint,
        customPrompt: customPrompt.trim() || undefined,
      });
      setGeneratedPlan(plan);
    } catch (err: any) {
      if (err.code === 'MISSING_API_KEY') {
        setIsKeyModalOpen(true);
      } else {
        setGenError(err.message || 'Failed to generate itinerary. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Action 2: Emergency Pivot with Gemini ──
  const handleRunPivot = async (reasonOverride?: string) => {
    setIsPivoting(true);
    const chosenReason = reasonOverride || pivotReason;
    if (reasonOverride) setPivotReason(reasonOverride);

    try {
      const res = await getGeminiWhatNext({
        destination: trip.destination || 'Puri & Konark',
        currentSpot: pivotLocation,
        reason: chosenReason,
      });
      setPivotResult(res);
    } catch (err: any) {
      if (err.code === 'MISSING_API_KEY') {
        setIsKeyModalOpen(true);
      } else {
        alert(err.message || 'Failed to get alternatives from Gemini.');
      }
    } finally {
      setIsPivoting(false);
    }
  };

  // ── Action 3: Hidden Gems with Gemini ──
  const handleFetchGems = async () => {
    setIsFetchingGems(true);
    try {
      const res = await getGeminiHiddenGems({
        destination: trip.destination || 'Odisha Road Trip (Puri, Konark, Bhubaneswar)',
      });
      setGemsResult(res);
    } catch (err: any) {
      if (err.code === 'MISSING_API_KEY') {
        setIsKeyModalOpen(true);
      } else {
        alert(err.message || 'Failed to get hidden gems from Gemini.');
      }
    } finally {
      setIsFetchingGems(false);
    }
  };

  // ── Action 4: Chat with Gemini Guide ──
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = chatInput.trim();
    if (!clean || isChatting) return;

    const newMsgs = [...chatMessages, { role: 'user' as const, text: clean }];
    setChatMessages(newMsgs);
    setChatInput('');
    setIsChatting(true);

    try {
      const reply = await chatWithGeminiGuide({
        destination: trip.destination || 'Puri & Konark, Odisha',
        customPrompt: clean,
      });
      setChatMessages([...newMsgs, { role: 'model', text: reply }]);
    } catch (err: any) {
      if (err.code === 'MISSING_API_KEY') {
        setIsKeyModalOpen(true);
      } else {
        setChatMessages([
          ...newMsgs,
          { role: 'model', text: `⚠️ ${err.message || 'Could not connect to Gemini AI.'}` },
        ]);
      }
    } finally {
      setIsChatting(false);
    }
  };

  // Add activities to Day
  const handleAddAllToDay = () => {
    if (!generatedPlan || !generatedPlan.activities) return;

    const formatted: ItineraryActivity[] = generatedPlan.activities.map((a, idx) => ({
      id: `act-gemini-${Date.now()}-${idx}`,
      time: a.time || '10:00 AM',
      title: a.title,
      location: a.location,
      notes: a.notes,
      status: 'upcoming',
    }));

    onAddActivitiesToDay(targetDay, formatted);
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      if (onClose) onClose();
    }, 1500);
  };

  return (
    <div className="glass-card p-4 sm:p-5 rounded-3xl border border-indigo-200/90 dark:border-indigo-900/80 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 space-y-4 shadow-md animate-fadeIn">
      {/* ── TOP HEADER & GEMINI KEY PILL ── */}
      <div className="flex items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-950/80 pb-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                Smart Itinerary Copilot & Local Guide
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-2xs">
                Powered by Google Gemini
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Dynamic schedules, emergency pivots & hidden dhaba recommendations for {trip.destination}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Gemini Key Pill */}
          <button
            type="button"
            onClick={() => setIsKeyModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all touch-manipulation min-h-[34px] ${
              hasApiKey
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
            }`}
            title="Configure your Google Gemini API Key"
          >
            <Key className="h-3.5 w-3.5" />
            <span>{hasApiKey ? 'Gemini: Active ✨' : 'Connect Key 🔑'}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 touch-manipulation"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── 4 NAVIGATION TABS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300/40 dark:border-slate-700/40">
        <button
          type="button"
          onClick={() => setActiveTab('generate')}
          className={`py-2 px-2 rounded-xl text-xs font-black transition-all touch-manipulation flex items-center justify-center gap-1.5 ${
            activeTab === 'generate'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Compass className="h-3.5 w-3.5 shrink-0" />
          <span>1-Click Day Plan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pivot')}
          className={`py-2 px-2 rounded-xl text-xs font-black transition-all touch-manipulation flex items-center justify-center gap-1.5 ${
            activeTab === 'pivot'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Flame className="h-3.5 w-3.5 shrink-0" />
          <span>What to Do Next?</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('gems');
            if (!gemsResult) handleFetchGems();
          }}
          className={`py-2 px-2 rounded-xl text-xs font-black transition-all touch-manipulation flex items-center justify-center gap-1.5 ${
            activeTab === 'gems'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>Hidden Gems</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`py-2 px-2 rounded-xl text-xs font-black transition-all touch-manipulation flex items-center justify-center gap-1.5 ${
            activeTab === 'chat'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          <span>Gemini Concierge</span>
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: 1-CLICK DAY SCHEDULE GENERATOR (REAL GEMINI) ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'generate' && (
        <div className="space-y-3.5">
          {/* Target Day & Vibe Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Target Day in Itinerary:
              </label>
              <select
                value={targetDay}
                onChange={(e) => setTargetDay(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <option key={num} value={num}>
                    Day {num}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Theme / Vibe Preset:
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {PRESET_VIBES.map((vibe) => (
                  <button
                    key={vibe.id}
                    type="button"
                    onClick={() => setSelectedVibe(vibe)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-manipulation min-h-[36px] ${
                      selectedVibe.id === vibe.id
                        ? 'bg-indigo-600 text-white shadow-xs font-black'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {vibe.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Prompt Box */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Custom Group Preferences (Optional):
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Include vegetarian food, budget-friendly, relaxed morning, sunset beach walk..."
              className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Generating for {trip.destination || 'Odisha'} with {trip.members.length} friends
            </span>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGeneratePlan}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white shadow-md shadow-indigo-500/25 min-h-[42px] touch-manipulation disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Gemini is Drafting Day Plan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Day {targetDay} Plan with Gemini</span>
                </>
              )}
            </button>
          </div>

          {genError && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {genError}
            </div>
          )}

          {/* ── Generated Plan Result Card ── */}
          {generatedPlan && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-200 dark:border-indigo-800 space-y-3 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2.5 flex-wrap">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Day {targetDay} Draft by Gemini AI
                  </span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {generatedPlan.dayTitle}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {generatedPlan.summary}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddAllToDay}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs min-h-[38px] touch-manipulation"
                >
                  {addedSuccess ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Added to Day {targetDay}!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Add All to Day {targetDay} Itinerary</span>
                    </>
                  )}
                </button>
              </div>

              {/* Dress Code & Tips Alerts */}
              {generatedPlan.dressCodeAndTips && generatedPlan.dressCodeAndTips.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Local Dress Codes & Travel Advisory:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {generatedPlan.dressCodeAndTips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Activities Timeline */}
              <div className="space-y-2 pt-1">
                {generatedPlan.activities.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3"
                  >
                    <div className="px-2 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-black shrink-0 font-mono">
                      {act.time}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {act.title}
                      </h5>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{act.location}</span>
                      </a>
                      {act.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {act.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: "WHAT TO DO NEXT?" EMERGENCY PIVOT (REAL GEMINI) ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pivot' && (
        <div className="space-y-3.5">
          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5">
            <Flame className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-amber-950 dark:text-amber-200">
                Live Situation Pivot
              </h4>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                If it started raining, the temple line is 3 hours long, or a spot is closed, Gemini recommends instant alternatives nearby.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Where are you right now?
              </label>
              <input
                type="text"
                value={pivotLocation}
                onChange={(e) => setPivotLocation(e.target.value)}
                placeholder="e.g. Near Jagannath Temple, Grand Road, Puri"
                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                What went wrong?
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  'Sudden Rain 🌧️',
                  'Crowded / Huge Queue 🚶',
                  'Starving for Food 🍽️',
                  'Want Sunset View 🌅',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleRunPivot(preset)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-500"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isPivoting}
            onClick={() => handleRunPivot()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 min-h-[42px] touch-manipulation disabled:opacity-50"
          >
            {isPivoting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Gemini is Finding Emergency Alternatives...</span>
              </>
            ) : (
              <>
                <Flame className="h-4 w-4" />
                <span>Ask Gemini: What Should We Do Right Now?</span>
              </>
            )}
          </button>

          {/* Pivot Result */}
          {pivotResult && (
            <div className="space-y-2.5 pt-1 animate-fadeIn">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 font-medium">
                💡 <strong>Gemini Advice:</strong> {pivotResult.situationAdvice}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {pivotResult.alternatives.map((alt, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        {alt.distanceEstimate}
                      </span>
                    </div>
                    <h5 className="text-xs font-black text-slate-900 dark:text-white">
                      {alt.title}
                    </h5>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alt.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{alt.location}</span>
                    </a>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      {alt.whyItWorksNow}
                    </p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold border-t border-slate-100 dark:border-slate-700/80 pt-1.5">
                      ⭐ {alt.insiderTip}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: HIDDEN GEMS & LOCAL DHABAS (REAL GEMINI) ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'gems' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                Authentic Highway Dhabas & Hidden Spots
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Non-touristy eateries, local sweet shops, and clean secluded coastal points
              </p>
            </div>
            <button
              type="button"
              disabled={isFetchingGems}
              onClick={handleFetchGems}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 touch-manipulation"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isFetchingGems ? 'animate-spin' : ''}`} />
              <span>Refresh with Gemini</span>
            </button>
          </div>

          {isFetchingGems && (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
              <p>Gemini is scouting local hidden spots & highway dhabas...</p>
            </div>
          )}

          {gemsResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
              {gemsResult.gems.map((gem, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 capitalize">
                      {gem.category || 'Spot'}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gem.name + ' ' + gem.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5 font-bold"
                    >
                      <span>Navigate</span>
                      <Navigation className="h-2.5 w-2.5" />
                    </a>
                  </div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white">
                    {gem.name}
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    📍 {gem.location}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    🔥 <strong>Must Try:</strong> {gem.mustTryOrHighlight}
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 italic">
                    💡 {gem.insiderTip}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: INTERACTIVE GEMINI CONCIERGE CHAT ── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'chat' && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900/60 max-h-60 overflow-y-auto space-y-2.5 text-xs">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatting && (
              <div className="flex justify-start">
                <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-400 text-xs flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                  <span>Gemini is typing...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendChat} className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything (e.g. Is phone allowed in Konark? Where to buy Khaja?)"
              className="flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isChatting || !chatInput.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 touch-manipulation shadow-xs"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* ── GEMINI API KEY MODAL ── */}
      <GeminiApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeySaved={refreshKeyStatus}
      />
    </div>
  );
}
