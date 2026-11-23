'use client';

import React, { useState } from 'react';
import { Trip, ItineraryDay, ItineraryActivity } from '@/types';
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
} from 'lucide-react';

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

const TEMPLATE_PLANS: Record<string, { title: string; dayTitle: string; activities: DraftActivity[] }> = {
  puri_temple_beach: {
    title: 'Puri Heritage, Jagannath Temple & Golden Beach',
    dayTitle: 'Puri Sacred Temples & Beach Vibes',
    activities: [
      {
        time: '06:30 AM',
        title: 'Golden Beach Sunrise & Morning Stroll',
        location: 'Golden Beach, Puri, Odisha',
        notes: 'Pristine Blue Flag certified beach stretch. Great for early sunrise photos and calm morning sea breeze.',
        dressCodeOrTips: 'Light clothing, beach footwear. Lifeguards active from 6 AM.',
      },
      {
        time: '09:00 AM',
        title: 'Shree Jagannath Temple Darshan',
        location: 'Jagannath Temple, Puri, Odisha',
        notes: 'World-famous 12th-century shrine. Observe the Patitapabana flag and Anandabazar Mahaprasad.',
        dressCodeOrTips: 'STRICT DRESS CODE: Traditional Indian attire (Kurtas/Dhotis for men, Sarees/Salwars for women). Strictly NO leather belts, wallets, cameras, or smartphones allowed inside premises.',
      },
      {
        time: '01:00 PM',
        title: 'Authentic Mahaprasad & Odisha Thali Lunch',
        location: 'Anandabazar / Grand Road, Puri',
        notes: 'Feast on pious Mahaprasad (Abhada) or authentic Dalma, Besara, and Chhena Poda.',
        dressCodeOrTips: 'Sit down dining on banana leaf. Cash / UPI widely accepted.',
      },
      {
        time: '04:30 PM',
        title: 'Swargadwar Beach Market & Marine Drive Evening',
        location: 'Swargadwar Road, Puri, Odisha',
        notes: 'Explore local handicraft stalls, famous Khaja sweets, and seashells craft.',
        dressCodeOrTips: 'Expect evening tourist crowds. Keep wallets secure.',
      },
      {
        time: '07:30 PM',
        title: 'Beachside Seafood Dhaba & Night Chill',
        location: 'Marine Drive Road, Puri',
        notes: 'Tasting fresh fried pomfret, prawns, and crabs fresh from the coast.',
        dressCodeOrTips: 'Casual attire.',
      },
    ],
  },
  konark_marine_drive: {
    title: 'Konark Sun Temple & Marine Drive Highway Cruise',
    dayTitle: 'Sun Temple Wonders & Highway Drive',
    activities: [
      {
        time: '07:30 AM',
        title: 'Scenic Puri-Konark Marine Drive Highway Ride',
        location: 'Marine Drive Road, NH-516A, Odisha',
        notes: 'One of India’s most scenic coastal roads running parallel to the Bay of Bengal.',
        dressCodeOrTips: 'Sunglasses & helmet/seatbelt required. Spectacular canopy drive.',
      },
      {
        time: '09:30 AM',
        title: 'Konark Sun Temple (Black Pagoda) Architectural Tour',
        location: 'Sun Temple, Konark, Odisha',
        notes: '13th-century UNESCO World Heritage stone chariot with 24 carved wheels representing sundials.',
        dressCodeOrTips: 'Entry tickets available via ASI QR code or counter. Cap and sunscreen recommended for open stone courtyards.',
      },
      {
        time: '12:30 PM',
        title: 'Chilika Dhaba Seafood Lunch (Fresh Prawns & Crabs)',
        location: 'Konark Highway Dhaba Strip',
        notes: 'Traditional coastal curry, fresh butter garlic prawns, and hot parathas.',
        dressCodeOrTips: 'Casual.',
      },
      {
        time: '03:30 PM',
        title: 'Chandrabhaga Beach Walk & Sunset Lighthouse',
        location: 'Chandrabhaga Beach, Konark, Odisha',
        notes: 'Calm, scenic, less crowded beach. Perfect for relaxing and watching coastal sunset.',
        dressCodeOrTips: 'Strong waves; swimming not recommended. Beautiful for photography.',
      },
      {
        time: '06:30 PM',
        title: 'Konark Sound & Light Show (or Marine Drive Cruise)',
        location: 'Sun Temple Premises, Konark',
        notes: 'Chronicles the glorious history and architectural legend of King Narasimhadeva I.',
        dressCodeOrTips: 'Evening show begins ~6:30 PM. Tickets available at site.',
      },
    ],
  },
  chilika_mangrove: {
    title: 'Chilika Lake & Satapada Irrawaddy Dolphins Tour',
    dayTitle: 'Chilika Lake Dolphins & Sea Mouth',
    activities: [
      {
        time: '07:00 AM',
        title: 'Drive to Satapada (Chilika Lake Entry Hub)',
        location: 'Satapada, Chilika, Odisha',
        notes: 'Asia’s largest brackish water lagoon. Scenic rural countryside drive.',
        dressCodeOrTips: 'Carry water and sunglasses.',
      },
      {
        time: '09:00 AM',
        title: 'OTDC Motorboat Safari to Dolphin Viewpoint',
        location: 'OTDC Boat Club, Satapada, Chilika',
        notes: 'Spot rare endangered Irrawaddy dolphins playing in open waters.',
        dressCodeOrTips: 'Life jackets provided by OTDC. Strictly mandatory during boat ride.',
      },
      {
        time: '11:30 AM',
        title: 'Sea Mouth Island & Rajhans Island Exploration',
        location: 'Sea Mouth, Chilika Lagoon, Odisha',
        notes: 'Where Chilika Lake merges with the Bay of Bengal ocean. Clean sandbars.',
        dressCodeOrTips: 'Island has local fried crab and tiger prawn stalls cooked live.',
      },
      {
        time: '03:00 PM',
        title: 'Alarnath Temple Visit on Return Drive',
        location: 'Brahmagiri, Alarnath Temple, Odisha',
        notes: 'Historic temple where devotees visit during Anavasara period of Lord Jagannath.',
        dressCodeOrTips: 'Famous for mouth-watering sweet Kheer prasad.',
      },
    ],
  },
};

const EMERGENCY_PIVOTS: {
  trigger: string;
  icon: string;
  label: string;
  desc: string;
  suggestions: { title: string; location: string; timeNeeded: string; notes: string }[];
}[] = [
  {
    trigger: 'rain',
    icon: '🌧️',
    label: 'It Started Raining!',
    desc: 'Indoor cultural attractions, museums, and covered heritage points nearby.',
    suggestions: [
      {
        title: 'Kala Bhoomi Odisha Crafts Museum',
        location: 'Pokhariput, Bhubaneswar',
        timeNeeded: '2 hours',
        notes: 'Spectacular covered indoor museum celebrating handloom, silver filigree, and terracotta craft.',
      },
      {
        title: 'Puri District Museum & Matha Exploration',
        location: 'VIP Road, Puri',
        timeNeeded: '1.5 hours',
        notes: 'Covers royal sculptures, ancient palm-leaf manuscripts, and temple architecture out of rain.',
      },
      {
        title: 'Traditional Sweet Tasting (Chhena Jhili & Poda)',
        location: 'Nimapada / Pipili Highway Sweets Hub',
        timeNeeded: '1 hour',
        notes: 'Hot freshly fried Chhena Jhili soaked in sugar syrup. Perfect rain comfort food!',
      },
    ],
  },
  {
    trigger: 'crowded',
    icon: '🚶',
    label: 'Spot Is Too Crowded / Huge Queue',
    desc: 'Quiet scenic alternatives with quick access and zero crowds.',
    suggestions: [
      {
        title: 'Ramachandi Beach & River Confluence',
        location: 'Ramachandi Temple, Marine Drive',
        timeNeeded: '1.5 hours',
        notes: 'Where Kusabhadra river meets the sea. Water sports, pine forests, and far fewer crowds than Puri.',
      },
      {
        title: 'Gundicha Temple Outer Gardens & Indradyumna Tank',
        location: 'Grand Road, Puri',
        timeNeeded: '1 hour',
        notes: 'Peaceful garden complex with historical giant holy turtles in the temple tank.',
      },
      {
        title: 'Baliharachandi Secluded Beach & Shrine',
        location: 'Brahmagiri Road, near Puri',
        timeNeeded: '2 hours',
        notes: 'Serene sand dunes and untouched coastal shoreline away from tourist bustle.',
      },
    ],
  },
  {
    trigger: 'food',
    icon: '🍽️',
    label: 'Group Is Starving! Best Food Now',
    desc: 'Top verified food stops for big groups, authentic regional tastes, and quick service.',
    suggestions: [
      {
        title: 'Wildgrass Restaurant (Heritage Garden Dining)',
        location: 'VIP Road, Puri',
        timeNeeded: '1 hour',
        notes: 'Renowned for authentic Odia crab curry, mutton kassa, and tranquil garden ambience.',
      },
      {
        title: 'Mahaveer Dhaba (Highway Special)',
        location: 'Puri-Bhubaneswar Highway NH-316',
        timeNeeded: '45 mins',
        notes: 'Crispy hot rotis, paneer butter masala, and local Rohu fish fry with rapid service.',
      },
      {
        title: 'Grand Road Khaja & Sweets Street',
        location: 'Bada Danda, Puri',
        timeNeeded: '30 mins',
        notes: 'Crispy layered Jagannath sweet Khaja straight from the hot oil cauldrons.',
      },
    ],
  },
  {
    trigger: 'sunset',
    icon: '🌅',
    label: 'Best Golden Hour / Sunset Point',
    desc: 'Unmatched 360-degree viewpoints for sunset group photography.',
    suggestions: [
      {
        title: 'Chandrabhaga Sunset Sandbar',
        location: 'Chandrabhaga Coast, Konark',
        timeNeeded: '1 hour',
        notes: 'Golden sunlight reflecting over the waves with the coastal lighthouse in the background.',
      },
      {
        title: 'Puri Marine Drive Pine Forest Beach',
        location: 'Between Balukhand Sanctuary & Marine Drive',
        timeNeeded: '1 hour',
        notes: 'Quiet coastal forest setting. Magical natural lighting for group portraits.',
      },
    ],
  },
];

const HIDDEN_GEMS: { title: string; category: string; location: string; badge: string; highlight: string }[] = [
  {
    title: 'Pipili Applique Artisan Village',
    category: 'Culture & Art',
    location: 'Pipili Town, NH-316',
    badge: 'Artisan Hub',
    highlight: 'Watch generational craftsmen hand-stitch colorful embroidered temple canopies, umbrellas & lamps.',
  },
  {
    title: 'Balukhand-Konark Wildlife Sanctuary',
    category: 'Nature & Wildlife',
    location: 'Marine Drive Road',
    badge: 'Spotted Deer',
    highlight: 'Coastal sanctuary filled with casuarina trees, spotted deers (blackbucks), and hidden quiet pathways.',
  },
  {
    title: 'Raghurajpur Heritage Crafts Village',
    category: 'Heritage',
    location: 'Near Chandanpur, Puri',
    badge: 'UNESCO Heritage Village',
    highlight: 'Every household is a master artist producing Pattachitra cloth paintings, palm-leaf engravings, and Gotipua dancers.',
  },
  {
    title: 'Nimapada Chhena Jhili Authentic Sweets',
    category: 'Foodie Secret',
    location: 'Nimapada, Odisha',
    badge: 'Legendary Sweet',
    highlight: 'Home to Odisha’s most iconic melt-in-mouth cottage cheese sweet, fried golden brown and simmered in light cardamom syrup.',
  },
];

export function ItineraryAiCopilot({
  trip,
  activeDayNumber,
  onAddActivitiesToDay,
  onClose,
}: ItineraryAiCopilotProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'pivot' | 'gems'>('generate');
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('puri_temple_beach');
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  const activePlan = TEMPLATE_PLANS[selectedPresetKey] || TEMPLATE_PLANS.puri_temple_beach;

  const handleApplyFullPlan = () => {
    const activitiesToAdd: ItineraryActivity[] = activePlan.activities.map((a, idx) => ({
      id: `ai_act_${Date.now()}_${idx}`,
      time: a.time,
      title: a.title,
      location: a.location,
      notes: `${a.notes}${a.dressCodeOrTips ? ` • [AI Tip / Dress Code: ${a.dressCodeOrTips}]` : ''}`,
      status: 'upcoming' as const,
      leadMemberId: trip.financeLeadId || trip.members[0]?.id,
    }));

    onAddActivitiesToDay(activeDayNumber, activitiesToAdd);
    setAppliedNotice(`Added ${activitiesToAdd.length} activities to Day ${activeDayNumber} schedule!`);
    setTimeout(() => setAppliedNotice(null), 4000);
  };

  const handleAddSingleActivity = (title: string, location: string, notes: string) => {
    const newAct: ItineraryActivity = {
      id: `ai_act_quick_${Date.now()}`,
      time: '04:00 PM',
      title,
      location,
      notes,
      status: 'upcoming' as const,
      leadMemberId: trip.financeLeadId || trip.members[0]?.id,
    };

    onAddActivitiesToDay(activeDayNumber, [newAct]);
    setAppliedNotice(`Added "${title}" to Day ${activeDayNumber}!`);
    setTimeout(() => setAppliedNotice(null), 4000);
  };

  return (
    <div className="glass-card p-4 sm:p-5 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-sky-950/20 shadow-xl space-y-4 animate-fadeIn">
      {/* Copilot Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-md shadow-indigo-500/25 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Smart Itinerary Copilot & Local Guide
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Targeting: <strong>Day {activeDayNumber}</strong> ({trip.destination || 'Odisha Roadtrip'})
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {appliedNotice && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <Check className="h-4 w-4 shrink-0" />
          <span>{appliedNotice}</span>
        </div>
      )}

      {/* Segmented Mode Selector */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300/40 dark:border-slate-700/40">
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
          onClick={() => setActiveTab('gems')}
          className={`py-2 px-2 rounded-xl text-xs font-black transition-all touch-manipulation flex items-center justify-center gap-1.5 ${
            activeTab === 'gems'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>Hidden Gems</span>
        </button>
      </div>

      {/* ── TAB 1: 1-CLICK DAY SCHEDULE GENERATOR ── */}
      {activeTab === 'generate' && (
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-2 px-2 sm:mx-0 sm:px-0">
            {Object.entries(TEMPLATE_PLANS).map(([key, plan]) => {
              const isSelected = selectedPresetKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedPresetKey(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-manipulation min-h-[36px] flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs font-black'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{plan.title.split('&')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Preview of AI Generated Schedule */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {activePlan.title}
                </h4>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                  {activePlan.activities.length} curated stops with travel & dress-code advice
                </span>
              </div>

              <button
                type="button"
                onClick={handleApplyFullPlan}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all touch-manipulation min-h-[38px]"
              >
                <Plus className="h-4 w-4" />
                <span>Apply to Day {activeDayNumber}</span>
              </button>
            </div>

            <div className="space-y-2">
              {activePlan.activities.map((act, idx) => (
                <div
                  key={idx}
                  className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                      {act.time}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                      📍 {act.location}
                    </span>
                  </div>

                  <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {act.title}
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{act.notes}</p>

                  {act.dressCodeOrTips && (
                    <div className="flex items-start gap-1.5 p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{act.dressCodeOrTips}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: "WHAT TO DO NEXT?" EMERGENCY PIVOT ── */}
      {activeTab === 'pivot' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Plans derailed by weather or crowds? Tap your current situation to get instant verified alternatives nearby:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EMERGENCY_PIVOTS.map((pivot) => (
              <div
                key={pivot.trigger}
                className="bg-white/90 dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{pivot.icon}</span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      {pivot.label}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{pivot.desc}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                  {pivot.suggestions.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h5 className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {s.title}
                          </h5>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shrink-0">
                            {s.timeNeeded}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">📍 {s.location}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                          {s.notes}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddSingleActivity(s.title, s.location, s.notes)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 touch-manipulation flex items-center gap-1"
                        title="Add to today's schedule"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: HIDDEN GEMS & LOCAL FOOD DHABAS ── */}
      {activeTab === 'gems' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Local spots along the route that regular tourists often drive right past:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {HIDDEN_GEMS.map((gem, idx) => (
              <div
                key={idx}
                className="bg-white/90 dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-start justify-between gap-2 shadow-xs"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                      {gem.badge}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{gem.category}</span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {gem.title}
                  </h4>
                  <p className="text-[11px] text-slate-500">📍 {gem.location}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {gem.highlight}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddSingleActivity(gem.title, gem.location, gem.highlight)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 touch-manipulation flex items-center gap-1 min-h-[36px]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Stop</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
