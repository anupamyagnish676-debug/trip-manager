'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Key, Check, ExternalLink, X, Shield, AlertCircle, Trash2 } from 'lucide-react';
import { getStoredGeminiApiKey, saveStoredGeminiApiKey, removeStoredGeminiApiKey } from '@/lib/geminiService';

interface GeminiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
}

export function GeminiApiKeyModal({ isOpen, onClose, onKeySaved }: GeminiApiKeyModalProps) {
  const [keyInput, setKeyInput] = useState('');
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGeminiApiKey();
      if (stored) {
        setHasExistingKey(true);
        setKeyInput(stored);
      } else {
        setHasExistingKey(false);
        setKeyInput('');
      }
      setIsSaved(false);
      setTestingStatus('idle');
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = keyInput.trim();
    if (!cleanKey) return;

    setTestingStatus('testing');
    setErrorMessage(null);

    // Quick verification call to test the key
    try {
      const testRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello, respond with: OK' }] }],
          }),
        }
      );

      if (!testRes.ok) {
        const errorData = await testRes.json().catch(() => ({}));
        throw new Error(
          errorData?.error?.message || `Gemini API verification failed with status ${testRes.status}.`
        );
      }

      // Valid key!
      saveStoredGeminiApiKey(cleanKey);
      setTestingStatus('valid');
      setIsSaved(true);
      setHasExistingKey(true);
      if (onKeySaved) onKeySaved();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setTestingStatus('invalid');
      setErrorMessage(err.message || 'Invalid Gemini API key. Please double check the key.');
    }
  };

  const handleRemove = () => {
    removeStoredGeminiApiKey();
    setKeyInput('');
    setHasExistingKey(false);
    setIsSaved(false);
    setTestingStatus('idle');
    if (onKeySaved) onKeySaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                Google Gemini AI
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Powers Smart Copilot & Trip Wrapped Stories
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 touch-manipulation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free Tier Info Banner */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-950 dark:text-indigo-200">
            <span className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Get Your Free Gemini API Key</span>
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white">
              100% Free
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Google provides free Gemini API access for personal projects. No credit card required.
          </p>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline pt-0.5"
          >
            <span>Open Google AI Studio to copy key</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Key Form */}
        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Paste Gemini API Key (starts with AIzaSy...):
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setTestingStatus('idle');
                  setErrorMessage(null);
                }}
                placeholder="AIzaSy..."
                className="w-full bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-mono py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {hasExistingKey && (
                <div className="absolute right-3 top-2.5">
                  <Check className="h-4 w-4 text-emerald-500" />
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSaved && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              <span>Gemini API Key verified and saved! Live AI is active.</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            {hasExistingKey && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 min-h-[40px] touch-manipulation"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[40px] touch-manipulation"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={testingStatus === 'testing' || !keyInput.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white shadow-md shadow-indigo-500/25 disabled:opacity-50 min-h-[40px] touch-manipulation"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{testingStatus === 'testing' ? 'Verifying...' : 'Save & Enable AI'}</span>
              </button>
            </div>
          </div>
        </form>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-400">
          <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>Your key stays in your local device storage and is only used to query Gemini.</span>
        </div>
      </div>
    </div>
  );
}
