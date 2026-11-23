'use client';

import React, { useState } from 'react';
import { Trip, ItineraryActivity } from '@/types';
import {
  Sparkles,
  Clock,
  MapPin,
  Check,
  Plus,
  X,
  Loader2,
  Info,
  RotateCcw,
  Languages,
} from 'lucide-react';
import { generateGeminiItinerary, GeneratedItineraryResponse } from '@/lib/geminiService';

interface ItineraryAiCopilotProps {
  trip: Trip;
  activeDayNumber: number;
  onAddActivitiesToDay: (dayNumber: number, activities: ItineraryActivity[]) => void;
  onClose?: () => void;
}

const QUICK_INSPIRATIONS = [
  'Morning temple darshan, local breakfast, afternoon beach, seafood dinner',
  'Scenic waterfall hike, highway dhaba lunch, lake boating & sunset viewpoint',
  'Local sightseeing, authentic Odia food crawl, market shopping & relaxed evening',
];

export function ItineraryAiCopilot({
  trip,
  activeDayNumber,
  onAddActivitiesToDay,
  onClose,
}: ItineraryAiCopilotProps) {
  const [targetDay, setTargetDay] = useState<number>(activeDayNumber || 1);
  const [userPrompt, setUserPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedItineraryResponse | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Available days for dropdown (existing trip days + extra day option)
  const existingDays = trip.itineraryDays?.length || 1;
  const dayOptions = Array.from({ length: Math.max(existingDays, targetDay, 3) }, (_, i) => i + 1);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenError(null);
    setAddedSuccess(false);

    try {
      const plan = await generateGeminiItinerary({
        destination: trip.destination || 'Odisha',
        tripName: trip.name,
        dayNumber: targetDay,
        members: trip.members.map((m) => ({ id: m.id, name: m.name })),
        customPrompt: userPrompt.trim() || undefined,
      });

      setGeneratedPlan(plan);
    } catch (err: any) {
      setGenError(
        err.message ||
          'Failed to connect to Gemini AI. Please verify GEMINI_API_KEY in Vercel environment variables.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddAllToItinerary = () => {
    if (!generatedPlan || !generatedPlan.activities || generatedPlan.activities.length === 0) return;

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
    }, 1400);
  };

  const handleReset = () => {
    setGeneratedPlan(null);
    setGenError(null);
  };

  return (
    <div className="glass-card p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-indigo-200/90 dark:border-indigo-900/80 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 space-y-4 shadow-md animate-fadeIn">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-3 border-b border-indigo-100 dark:border-indigo-950/80 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                Gemini AI Itinerary Assistant
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-2xs">
                Google Gemini
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Type your plan in your own words (English, Hindi, Odia, etc.) — Gemini will seed structured cards.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 touch-manipulation shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Close AI Assistant"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── INPUT FORM (WHEN NOT PREVIEWING RESULTS) ── */}
      {!generatedPlan ? (
        <div className="space-y-3.5">
          {/* Target Day Picker */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Add activities to:
            </span>
            <select
              value={targetDay}
              onChange={(e) => setTargetDay(Number(e.target.value))}
              className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-black py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none min-h-[38px] touch-manipulation cursor-pointer"
            >
              {dayOptions.map((num) => (
                <option key={num} value={num}>
                  Day {num} Timeline
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              for {trip.destination || 'trip'}
            </span>
          </div>

          {/* Prompt Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-indigo-500" />
                <span>Tell Gemini in your own words / any language:</span>
              </label>
              {userPrompt && (
                <button
                  type="button"
                  onClick={() => setUserPrompt('')}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            <textarea
              rows={3}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g. Subah 8am breakfast at local tiffin shop, 10am Deomali hills trek, 1:30pm lunch with desi chicken at highway dhaba, 4:30pm Duduma waterfall viewpoint, 7pm coffee and sunset at Kolab dam..."
              className="w-full bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white text-xs sm:text-sm p-3 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all resize-y leading-relaxed"
            />
          </div>

          {/* Quick Inspirations */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Quick Ideas (Tap to fill):
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_INSPIRATIONS.map((idea, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setUserPrompt(idea)}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-all whitespace-nowrap shrink-0 touch-manipulation min-h-[32px]"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {genError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <span className="shrink-0 text-sm">⚠️</span>
              <div className="flex-1">
                <span className="font-bold">Error: </span>
                {genError}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 shadow-md shadow-indigo-500/25 transition-all touch-manipulation min-h-[44px] disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Gemini is formatting your itinerary...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Format & Seed Day {targetDay} with Gemini</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* ── GENERATED RESULTS PREVIEW ── */
        <div className="space-y-3.5 animate-fadeIn">
          {/* Day Title & Summary */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-200/80 dark:border-indigo-900/60 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                Day {targetDay} Preview
              </span>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                {generatedPlan.dayTitle}
              </h4>
            </div>
            {generatedPlan.summary && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {generatedPlan.summary}
              </p>
            )}
          </div>

          {/* Activities List */}
          <div className="space-y-2">
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
              Generated Activities ({generatedPlan.activities.length}):
            </span>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {generatedPlan.activities.map((act, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-lg">
                      <Clock className="h-3 w-3 shrink-0" />
                      {act.time}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate max-w-[180px]">
                      <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span className="truncate">{act.location}</span>
                    </span>
                  </div>

                  <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {act.title}
                  </h5>

                  {act.notes && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg leading-relaxed">
                      💡 {act.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dress code & tips */}
          {generatedPlan.dressCodeAndTips && generatedPlan.dressCodeAndTips.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Local Tips & Reminders
              </span>
              <ul className="text-[11px] text-amber-900 dark:text-amber-200 space-y-0.5 list-disc list-inside">
                {generatedPlan.dressCodeAndTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Banner */}
          {addedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-xs font-black text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2">
              <Check className="h-4 w-4" />
              <span>Activities successfully added to Day {targetDay}!</span>
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={addedSuccess}
              onClick={handleAddAllToItinerary}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/25 transition-all touch-manipulation min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              <span>Add All to Day {targetDay} Itinerary</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 touch-manipulation min-h-[44px]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Write Different Plan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
