import { NextRequest, NextResponse } from 'next/server';

interface GeminiRequestPayload {
  action: 'generate_itinerary' | 'what_next' | 'hidden_gems' | 'trip_wrapped' | 'chat';
  destination?: string;
  tripName?: string;
  dayNumber?: number;
  durationDays?: number;
  members?: { id: string; name: string }[];
  preferences?: string;
  customPrompt?: string;
  currentSpot?: string;
  weatherInfo?: string;
  reason?: string;
  financialSummary?: {
    totalSpend: number;
    currency: string;
    expenseCount: number;
    expenses: { title: string; amount: number; category: string; paidBy: string; date?: string }[];
    topCategories: { category: string; amount: number; pct: number }[];
    balances: { memberName: string; netBalance: number; totalPaid: number }[];
  };
  chatMessages?: { role: 'user' | 'model'; content: string }[];
}

interface ModelEndpoint {
  version: 'v1beta' | 'v1';
  model: string;
}

let cachedWorkingEndpoint: ModelEndpoint | null = null;

function cleanJsonParse(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    } catch {
      // Fall through to JSON.parse
    }
  }

  return JSON.parse(cleaned);
}

async function fetchGeminiWithEndpoint(
  endpoint: ModelEndpoint,
  apiKey: string,
  prompt: string,
  systemInstruction?: string,
  responseJson: boolean = false
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/${endpoint.version}/models/${endpoint.model}:generateContent?key=${apiKey}`;

  // For v1beta: systemInstruction and responseMimeType are supported
  // For v1: only contents is supported; systemInstruction and responseMimeType will cause 400 Bad Request
  let effectivePrompt = prompt;
  const payload: any = {
    generationConfig: {
      temperature: 0.7,
    },
  };

  if (endpoint.version === 'v1beta') {
    payload.contents = [{ parts: [{ text: effectivePrompt }] }];
    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }
    if (responseJson) {
      payload.generationConfig.responseMimeType = 'application/json';
    }
  } else {
    // Stable v1: embed systemInstruction into the prompt text
    if (systemInstruction) {
      effectivePrompt = `${systemInstruction}\n\n${responseJson ? 'CRITICAL: Output ONLY valid JSON matching the requested schema. No surrounding markdown or prose.\n\n' : ''}${prompt}`;
    } else if (responseJson) {
      effectivePrompt = `CRITICAL: Output ONLY valid JSON matching the requested schema. No surrounding markdown or prose.\n\n${prompt}`;
    }
    payload.contents = [{ parts: [{ text: effectivePrompt }] }];
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    // If v1beta failed with 400 (e.g. responseMimeType unsupported on older model), try simplified fallback
    if (res.status === 400 && responseJson && endpoint.version === 'v1beta') {
      const fallbackPayload = {
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction || ''}\n\nIMPORTANT: Return valid JSON only.\n\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.7 },
      };
      const retryRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackPayload),
      });
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        const retryText = retryData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (retryText) return retryText;
      }
    }

    throw new Error(
      `Gemini API error (${res.status}) on ${endpoint.version}/${endpoint.model}: ${errorText}`
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned an empty response.');
  }

  return text;
}

async function discoverAvailableModels(apiKey: string): Promise<ModelEndpoint[]> {
  const versions: ('v1beta' | 'v1')[] = ['v1beta', 'v1'];
  const candidates: ModelEndpoint[] = [];

  for (const ver of versions) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          for (const m of data.models) {
            if (m.supportedGenerationMethods?.includes('generateContent')) {
              const modelName = m.name?.replace(/^models\//, '');
              if (modelName) {
                candidates.push({ version: ver, model: modelName });
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn(`ListModels error on ${ver}:`, e);
    }
  }

  // Prioritize fast modern models: gemini-2.0-flash, gemini-1.5-flash-latest, etc.
  candidates.sort((a, b) => {
    const score = (ep: ModelEndpoint) => {
      const name = ep.model.toLowerCase();
      let s = 0;
      if (name.includes('2.5-flash')) s += 120;
      else if (name.includes('2.0-flash')) s += 110;
      else if (name.includes('1.5-flash-latest')) s += 100;
      else if (name.includes('1.5-flash-002')) s += 95;
      else if (name.includes('1.5-flash-001')) s += 90;
      else if (name.includes('1.5-flash')) s += 85;
      else if (name.includes('flash')) s += 70;
      else if (name.includes('1.5-pro')) s += 60;
      else if (name.includes('pro')) s += 50;

      // Prefer v1beta for modern structured generation features
      if (ep.version === 'v1beta') s += 5;
      return s;
    };
    return score(b) - score(a);
  });

  return candidates;
}

async function callGeminiApi(
  apiKey: string,
  prompt: string,
  systemInstruction?: string,
  responseJson: boolean = false
): Promise<string> {
  // 1. Try cached working endpoint first
  if (cachedWorkingEndpoint) {
    try {
      return await fetchGeminiWithEndpoint(
        cachedWorkingEndpoint,
        apiKey,
        prompt,
        systemInstruction,
        responseJson
      );
    } catch (e) {
      console.warn('Cached Gemini endpoint failed, refreshing available models:', e);
      cachedWorkingEndpoint = null;
    }
  }

  // 2. Dynamically query Google's ListModels API to get exact supported models for this key
  try {
    const discovered = await discoverAvailableModels(apiKey);
    if (discovered.length > 0) {
      for (const endpoint of discovered) {
        try {
          const result = await fetchGeminiWithEndpoint(
            endpoint,
            apiKey,
            prompt,
            systemInstruction,
            responseJson
          );
          cachedWorkingEndpoint = endpoint;
          return result;
        } catch (err: any) {
          console.warn(`Discovered model ${endpoint.version}/${endpoint.model} failed:`, err.message);
        }
      }
    }
  } catch (discoveryErr) {
    console.warn('Dynamic model discovery failed, falling back to static roster:', discoveryErr);
  }

  // 3. Fallback static candidate roster across Google GenAI versions
  const staticCandidates: ModelEndpoint[] = [
    { version: 'v1beta', model: 'gemini-2.0-flash' },
    { version: 'v1beta', model: 'gemini-2.0-flash-exp' },
    { version: 'v1beta', model: 'gemini-1.5-flash-latest' },
    { version: 'v1beta', model: 'gemini-1.5-flash-002' },
    { version: 'v1beta', model: 'gemini-1.5-flash-001' },
    { version: 'v1', model: 'gemini-1.5-flash' },
    { version: 'v1beta', model: 'gemini-1.5-flash' },
    { version: 'v1beta', model: 'gemini-2.5-flash' },
    { version: 'v1beta', model: 'gemini-1.5-pro-latest' },
    { version: 'v1', model: 'gemini-1.5-pro' },
    { version: 'v1', model: 'gemini-pro' },
  ];

  let lastError: Error | null = null;
  for (const candidate of staticCandidates) {
    try {
      const result = await fetchGeminiWithEndpoint(
        candidate,
        apiKey,
        prompt,
        systemInstruction,
        responseJson
      );
      cachedWorkingEndpoint = candidate;
      return result;
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to generate content from Gemini API with any available model.');
}

// ─────────────────────────────────────────────────────────────
// SMART LOCAL BACKUP GENERATORS
// Used seamlessly if Google Gemini API key has quota limits or network outages
// ─────────────────────────────────────────────────────────────
function generateFallbackItinerary(destination: string, dayNum: number, userPrompt?: string) {
  const destLower = (destination || '').toLowerCase();
  const promptLower = (userPrompt || '').toLowerCase();
  const isKoraput = destLower.includes('koraput') || destLower.includes('deomali');

  if (isKoraput) {
    if (dayNum === 2) {
      return {
        dayTitle: `Day 2: Deomali Peak Sunrise & Duduma Waterfalls`,
        summary: `Conquer the highest peak of Odisha at sunrise, explore roaring waterfalls, and enjoy authentic tribal flavors.`,
        activities: [
          {
            time: '05:00 AM',
            title: 'Deomali Peak Sunrise Viewpoint',
            location: 'Deomali Hills, Koraput (Highest Peak in Odisha)',
            notes: 'Start early to catch the sea of clouds and panoramic mountain sunrise. Carry light woolens.',
          },
          {
            time: '09:00 AM',
            title: 'Putsil Valley Breakfast & Coffee',
            location: 'Putsil Valley Viewpoint & Eco Canteen',
            notes: 'Sip piping hot fresh Koraput organic arabica coffee with hot parathas amid mist.',
          },
          {
            time: '12:30 PM',
            title: 'Duduma Waterfall & Machkund River Canyon',
            location: 'Duduma Falls (175m plunge), Badiguda',
            notes: 'One of the tallest and most breathtaking waterfalls in eastern India. Great photo vantage points.',
          },
          {
            time: '02:30 PM',
            title: 'Local Highway Dhaba Lunch',
            location: 'Semiliguda Highway Dhaba',
            notes: 'Taste authentic Desi kukkuda (country chicken curry) and fresh local river fish fry.',
          },
          {
            time: '05:00 PM',
            title: 'Rani Duduma Waterfall & Pine Woods',
            location: 'Nandapur Forest Reserve',
            notes: 'Calm, less crowded cascading stream surrounded by fragrant pine woods.',
          },
          {
            time: '08:00 PM',
            title: 'Bonfire & Koraput Night Vibe',
            location: 'Koraput Hilltop Retreat / Resort',
            notes: 'Relax under stargazing skies with campfire and hot Mandia soup.',
          },
        ],
        dressCodeAndTips: [
          'Deomali can be windy and chilly in the morning; carry a windcheater or light jacket.',
          'Sturdy sports shoes or sneakers recommended for rocky trails around Duduma canyon.',
        ],
      };
    }

    if (dayNum >= 3) {
      return {
        dayTitle: `Day ${dayNum}: Gupteswar Sacred Cave & Kolab Reservoir`,
        summary: `Explore sacred subterranean limestone caves, tranquil reservoir islands, and vibrant tribal markets.`,
        activities: [
          {
            time: '08:30 AM',
            title: 'Gupteswar Cave Temple & Sabari River',
            location: 'Gupteswar Forest Sanctuary, Jeypore',
            notes: 'Ancient underground Shiva lingam inside natural limestone cavern surrounded by dense sal forest.',
          },
          {
            time: '12:30 PM',
            title: 'Kolab Dam & Reservoir Island Boating',
            location: 'Upper Kolab Hydroelectric Reservoir',
            notes: 'Huge scenic water reservoir with tranquil speedboat and peddle boat rides among green hills.',
          },
          {
            time: '03:30 PM',
            title: 'Sabara Srikhetra Jagannath Temple',
            location: 'Koraput Town Hilltop',
            notes: 'Unique temple where tribal Jagannath culture is celebrated without caste restrictions.',
          },
          {
            time: '06:00 PM',
            title: 'Koraput Coffee Garden & Tribal Craft Souvenirs',
            location: 'Coffee Board Plantation & Tribal Museum',
            notes: 'Buy premium single-origin Koraput coffee beans, organic forest honey, and Dokra metal crafts.',
          },
        ],
        dressCodeAndTips: [
          'Cave stairs at Gupteswar can be slippery; step carefully on wet limestone.',
          'Please respect local tribal craft artisans; avoid unauthorized photography in residential villages.',
        ],
      };
    }

    return {
      dayTitle: `Day 1: Arrival & Exploring The Green Crown of Odisha`,
      summary: `Welcome to the mystical hill plateau of Koraput! Experience lush coffee plantations, tribal culture, and serene reservoir sunsets.`,
      activities: [
        {
          time: '09:00 AM',
          title: 'Arrival & Fresh Koraput Arabica Coffee',
          location: 'Koraput Town Center',
          notes: 'Freshly brewed locally grown high-altitude coffee with traditional breakfast.',
        },
        {
          time: '11:00 AM',
          title: 'Tribal Museum & Cultural Heritage',
          location: 'Koraput Tribal Heritage Center',
          notes: 'Fascinating display of indigenous tools, musical instruments, and traditional tribal shrines.',
        },
        {
          time: '01:30 PM',
          title: 'Authentic Local Feast & Mandia Jau',
          location: 'Jeypore-Koraput Road Traditional Eatery',
          notes: 'Try wholesome Mandia (ragi) delicacies, dalma, and local bamboo-shoot fry.',
        },
        {
          time: '04:30 PM',
          title: 'Kolab Botanical Garden & Sunset Viewpoint',
          location: 'Kolab Reservoir Gardens',
          notes: 'Landscaped terrace gardens facing the vast Kolab lake during golden sunset hour.',
        },
        {
          time: '07:30 PM',
          title: 'Group Dinner & Stargazing',
          location: 'Semiliguda / Koraput Valley Dhaba',
          notes: 'Warm highway tandoor feast and planning tomorrow’s Deomali mountain trek.',
        },
      ],
      dressCodeAndTips: [
        'Keep light fleece layers handy for breezy mountain evenings.',
        'Carry cash for village coffee stalls as digital UPI network can be intermittent on winding ghats.',
      ],
    };
  }

  // General Odisha (Puri, Konark, Chilika) Fallback
  return {
    dayTitle: `Day ${dayNum}: Exploring ${destination || 'Odisha'} Highlights`,
    summary: `Curated day itinerary featuring top historical landmarks, scenic coastal landscapes, and authentic local cuisine.`,
    activities: [
      {
        time: '08:00 AM',
        title: 'Morning Exploration & Heritage Walk',
        location: `${destination} Landmark District`,
        notes: 'Early morning start to avoid crowds and enjoy the best ambient morning light.',
      },
      {
        time: '11:30 AM',
        title: 'Scenic Viewpoint & Cultural Spot',
        location: `${destination} Viewpoint`,
        notes: 'Iconic local vista with photography opportunities and historical architecture.',
      },
      {
        time: '01:30 PM',
        title: 'Authentic Local Specialties Lunch',
        location: `Famous Local Eatery / Dhaba`,
        notes: 'Delicious local delicacies, regional seafood or traditional vegetarian thali.',
      },
      {
        time: '05:00 PM',
        title: 'Golden Hour & Sunset Stroll',
        location: `${destination} Sunset Point`,
        notes: 'Vibrant sunset atmosphere, cool sea/hill breeze, and relaxed group banter.',
      },
      {
        time: '08:00 PM',
        title: 'Night Food Crawl & Sweet Stop',
        location: `Local Bazaar`,
        notes: 'End the day tasting famous regional sweets (Chhena Poda/Khaja) and evening tea.',
      },
    ],
    dressCodeAndTips: [
      'Carry water bottles and comfortable walking footwear.',
      'Check temple dress codes (no leather belts or shorts permitted in sanctum areas).',
    ],
  };
}

function generateFallbackTripWrapped(summary: any, tripName: string, destination: string) {
  const total = summary.totalSpend || 0;
  const count = summary.expenseCount || 0;
  const cur = summary.currency || 'INR';
  const topCat = summary.topCategories?.[0]?.category || 'food';
  const memberCount = summary.balances?.length || 7;
  const avgShare = memberCount > 0 ? Math.round(total / memberCount) : 0;

  return {
    vibeTitle: `${destination} Highway Legends Expedition`,
    catchphrase: `A legendary mountain roadtrip where ${memberCount} friends shared ${count} bills equally with zero drama!`,
    totalSpendFormatted: `${cur} ${total.toLocaleString('en-IN')}`,
    chapters: [
      {
        chapterNumber: 1,
        title: 'The Great Mountain Adventure',
        icon: '🏔️',
        story: `Across this epic ${destination} journey, the crew invested a grand total of ${cur} ${total.toLocaleString('en-IN')} across ${count} adventures. Dominating the trip was ${topCat.toUpperCase()}, fueling our journeys through winding ghats, misty peaks, and scenic halts. Every rupee was an investment in unforgettable memories.`,
        statBadges: [`${cur} ${total.toLocaleString('en-IN')} Total Group Spend`, `${count} Bills Logged`, `Top Category: ${topCat}`],
      },
      {
        chapterNumber: 2,
        title: 'Peak Feast & Highway Milestones',
        icon: '⚡',
        story: `From steaming cups of roadside tea and hot parathas to authentic local dhabas, the group lived large. The team stayed united through every single pitstop, keeping spirits high across every kilometer of the journey!`,
        statBadges: [`Avg ${cur} ${avgShare.toLocaleString('en-IN')} per friend`, `Peak Vibe: Highway Dhabas & Viewpoints`],
      },
      {
        chapterNumber: 3,
        title: 'The Equal Split Fellowship',
        icon: '🤝',
        story: `The true hallmark of this friendship: 100% EQUAL SHARES! No matter who had cash at hand or swiped at a stall, every friend chipped in equally at the end. Zero financial judgement, zero awkwardness, only pure brotherhood.`,
        statBadges: ['100% Equal Split Homies', 'Zero Financial Judgement', 'Lifelong Memories'],
      },
    ],
    memberSuperlatives: (summary.balances || []).map((b: any, idx: number) => {
      // 100% PERSONALITY AND TRAVEL ROLE BASED — NEVER JUDGE ON MONEY!
      const personalityAwards = [
        { title: 'The Master Route Navigator', reason: 'Masterminded the scenic shortcuts, curve warnings, and mountain viewpoints.' },
        { title: 'The Dhaba & Food Connoisseur', reason: 'Ensured the crew tasted the most delicious local feasts, fresh fry, and authentic dishes.' },
        { title: 'The Aux Cable & Playlist DJ', reason: 'Kept the car sound system pumping with roadtrip anthems through every mountain turn.' },
        { title: 'The Golden Hour Photographer', reason: 'Captured the most cinematic group portraits, mist reels, and scenic sunsets.' },
        { title: 'The Highway Snack Auditor', reason: 'Kept the group fueled with biscuits, chips, and refreshing chai halts.' },
        { title: 'The Mountain Philosopher', reason: 'Shared legendary roadtrip stories, deep talks, and endless laughs at every stop.' },
        { title: 'The Early Bird Viewpoint Scout', reason: 'First to spot the sea of clouds and inspire the crew to reach the summit.' },
        { title: 'The Chill Co-Pilot Legend', reason: 'Always kept the driver company with great energy, alertness, and endless jokes.' },
        { title: 'The Equal Split Champion', reason: 'Stands tall for 100% equal brotherhood, fair shares, and hassle-free adventures.' },
      ];
      const match = personalityAwards[idx % personalityAwards.length];
      return {
        memberName: b.memberName,
        awardTitle: match.title,
        reason: match.reason,
      };
    }),
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const body: GeminiRequestPayload = await req.json();
    const { action } = body;

    // ── 1. GENERATE ITINERARY ──
    if (action === 'generate_itinerary') {
      const destination = body.destination || 'Koraput, Odisha';
      const dayNum = body.dayNumber || 1;
      const membersList = (body.members || []).map((m) => m.name).join(', ') || 'Friends group';
      const userInput = (body.customPrompt || body.preferences || '').trim();

      const systemInstruction = `You are an expert travel assistant and intelligent itinerary organizer for trips to ${destination}.
Your job is to take the user's travel ideas or rough itinerary—typed in ANY language (English, Hindi, Odia, Bengali, Hinglish, shorthand notes)—and automatically extract, format, and seed them into a realistic, structured chronological day schedule.

GUIDELINES:
1. Parse the user's instructions regardless of language, slang, or formatting.
2. If the user mentions specific timings (e.g. "8am", "morning", "lunch around 2", "sunset"), preserve and organize them chronologically.
3. If the user gives only locations or food items, assign realistic logical times and sequence them geographically in or around ${destination}.
4. If the user gives a brief prompt, enrich it with genuine local knowledge, scenic spots, authentic highway dhabas, local specialties, and temple/mountain guidelines for ${destination}.
5. For each activity, include:
   - "time": e.g. "08:30 AM" (12-hour format with AM/PM)
   - "title": Clear and punchy activity name
   - "location": Specific venue, viewpoint, cave, temple, waterfall, or dhaba name
   - "notes": Helpful insider guidance, what to try/eat, entry/dress code details, or photography tips
6. Under "dressCodeAndTips", add 1-3 actionable travel reminders (e.g. footwear, camera permits, best sunset timing).

You MUST return valid JSON matching this schema:
{
  "dayTitle": "Engaging descriptive title for Day ${dayNum}",
  "summary": "1-2 sentence overview of today's schedule and vibe",
  "activities": [
    {
      "time": "08:30 AM",
      "title": "Concise activity title",
      "location": "Exact landmark/place name",
      "notes": "Practical local tip, recommended dish, or timing advice"
    }
  ],
  "dressCodeAndTips": [
    "Helpful local tip, reminder, or advisory"
  ]
}`;

      const prompt = `Plan Day ${dayNum} for trip in ${destination}.
Group members: ${membersList}.

USER'S TRAVEL PLAN / INSTRUCTIONS (IN THEIR OWN LANGUAGE):
"""
${userInput || `Plan a memorable, well-balanced Day ${dayNum} exploring top spots, hidden waterfalls/hills, and delicious local food in ${destination}.`}
"""

Please format this into structured chronological activities (3 to 6 activities).`;

      if (apiKey) {
        try {
          const result = await callGeminiApi(apiKey, prompt, systemInstruction, true);
          const parsed = cleanJsonParse(result);
          if (parsed && Array.isArray(parsed.activities) && parsed.activities.length > 0) {
            return NextResponse.json({ success: true, data: parsed });
          }
        } catch (apiErr: any) {
          console.warn('Gemini API call failed, generating with smart local AI fallback:', apiErr.message);
        }
      }

      // Smart local AI fallback generator ensures user never gets blocked by API errors
      const fallbackData = generateFallbackItinerary(destination, dayNum, userInput);
      return NextResponse.json({ success: true, data: fallbackData, isFallback: true });
    }

    // ── 2. EMERGENCY PIVOT ("WHAT SHOULD WE DO NEXT?") ──
    if (action === 'what_next') {
      const destination = body.destination || 'Koraput, Odisha';
      const currentSpot = body.currentSpot || 'Near City Center';
      const weather = body.weatherInfo || 'Pleasant Hill Weather, 24°C';
      const reason = body.reason || 'Spot is overly crowded or it started raining';

      const systemInstruction = `You are a real-time local travel copilot assisting travelers on the ground in ${destination}.
Travelers are at or near "${currentSpot}".
Current weather conditions: "${weather}".
Problem / Situation: "${reason}".
Suggest 3 immediate, high-quality, practical alternative activities nearby.
Return valid JSON matching:
{
  "situationAdvice": "Empathetic, quick strategic advice for this situation",
  "alternatives": [
    {
      "title": "Catchy name of alternative activity",
      "location": "Exact location / venue name",
      "distanceEstimate": "Estimated driving/auto distance (e.g., 10 mins away (3.5 km))",
      "whyItWorksNow": "Why this is ideal right now given weather/crowds",
      "insiderTip": "What to do, see, or eat there"
    }
  ]
}`;

      const prompt = `Recommend 3 immediate emergency pivot alternatives for travelers stuck at "${currentSpot}" in ${destination}.
Situation: ${reason}. Current weather: ${weather}.`;

      if (apiKey) {
        try {
          const result = await callGeminiApi(apiKey, prompt, systemInstruction, true);
          const parsed = cleanJsonParse(result);
          if (parsed && Array.isArray(parsed.alternatives)) {
            return NextResponse.json({ success: true, data: parsed });
          }
        } catch (apiErr: any) {
          console.warn('Gemini what_next failed, using fallback:', apiErr.message);
        }
      }

      // Fallback alternatives
      return NextResponse.json({
        success: true,
        data: {
          situationAdvice: `No worries! In ${destination}, when the main spot gets crowded or weather shifts, nearby valleys and tea stops offer stunning peaceful alternatives.`,
          alternatives: [
            {
              title: 'Lush Pine Woods & Viewpoint Halt',
              location: 'Upper Valley Road, 15 mins away',
              distanceEstimate: '15 mins drive (6 km)',
              whyItWorksNow: 'Sheltered by lush canopy and offers serene misty mountain views.',
              insiderTip: 'Grab hot local roasted corn and ginger chai from the roadside stalls.',
            },
            {
              title: 'Tribal Cultural Museum & Indoor Gallery',
              location: 'Koraput Town Cultural Center',
              distanceEstimate: '10 mins drive (3 km)',
              whyItWorksNow: 'Perfect indoor retreat with incredible heritage exhibits.',
              insiderTip: 'Check out the authentic Dokra metal artifacts and tribal jewelry collection.',
            },
            {
              title: 'Authentic Highway Dhaba & Coffee Stop',
              location: 'Semiliguda Highway Bypass',
              distanceEstimate: '20 mins drive (9 km)',
              whyItWorksNow: 'Spacious open-air seating with freshly prepared hot local meals.',
              insiderTip: 'Try the hot Parathas with Country Chicken or organic Koraput filtered coffee.',
            },
          ],
        },
      });
    }

    // ── 3. HIDDEN GEMS & LOCAL DHABAS ──
    if (action === 'hidden_gems') {
      const destination = body.destination || 'Koraput, Odisha';
      const style = body.preferences || 'Local Dhabas & Authentic Street Food, Scenic Viewpoints';

      const systemInstruction = `You are a native local food and travel insider for ${destination}.
Provide 4 authentic, non-touristy hidden gems: authentic highway dhabas, local sweet/coffee shops, secluded waterfalls/sunset spots, or cultural secrets.
Return valid JSON matching:
{
  "category": "Hidden Gems & Authentic Eats",
  "gems": [
    {
      "name": "Name of gem / dhaba / spot",
      "category": "dhaba" | "sunset" | "food" | "scenic",
      "location": "Exact spot or highway stretch",
      "mustTryOrHighlight": "Signature dish or view that makes it special",
      "insiderTip": "Local secret, best timing, or ordering tip"
    }
  ]
}`;

      const prompt = `Provide 4 authentic hidden gems and local dhabas for ${destination}. Focus on ${style}.`;

      if (apiKey) {
        try {
          const result = await callGeminiApi(apiKey, prompt, systemInstruction, true);
          const parsed = cleanJsonParse(result);
          if (parsed && Array.isArray(parsed.gems)) {
            return NextResponse.json({ success: true, data: parsed });
          }
        } catch (apiErr: any) {
          console.warn('Gemini hidden_gems failed, using fallback:', apiErr.message);
        }
      }

      // Fallback hidden gems
      return NextResponse.json({
        success: true,
        data: {
          category: 'Hidden Gems & Authentic Eats',
          gems: [
            {
              name: 'Putsil Valley "Floating Cloud" Viewpoint',
              category: 'scenic',
              location: 'Near Semiliguda-Deomali Foothills',
              mustTryOrHighlight: 'Early morning sea of clouds cascading over green hill crests',
              insiderTip: 'Arrive between 5:30 AM and 7:00 AM for the dreamiest misty cloud photography.',
            },
            {
              name: 'Koraput Arabica Coffee Garden Cafe',
              category: 'food',
              location: 'Coffee Board Plantation Estate',
              mustTryOrHighlight: 'Freshly roasted single-origin shade-grown organic filter coffee',
              insiderTip: 'You can buy freshly ground vacuum-packed coffee beans directly from the processing unit.',
            },
            {
              name: 'Desi Kukkuda & Bamboo Shoot Highway Dhaba',
              category: 'dhaba',
              location: 'Jeypore-Koraput NH326 Stretch',
              mustTryOrHighlight: 'Authentic free-range country chicken slow cooked with wild coriander',
              insiderTip: 'Pair it with hot steamed rice and fresh local Mandia Jau.',
            },
            {
              name: 'Gupteswar Sabari River Secret Shallows',
              category: 'sunset',
              location: 'Behind the sacred limestone cave sanctuary',
              mustTryOrHighlight: 'Crystal clear pebble riverbed shaded by ancient Sal trees',
              insiderTip: 'Dip your feet into the cool running river water after climbing down the cave.',
            },
          ],
        },
      });
    }

    // ── 4. END-OF-TRIP "TRIP WRAPPED" STORYTELLER ──
    if (action === 'trip_wrapped') {
      const summary = body.financialSummary;
      const tripName = body.tripName || 'Our Trip';
      const destination = body.destination || 'Koraput, Odisha';

      if (!summary || !summary.expenses || summary.expenses.length === 0) {
        return NextResponse.json(
          {
            error: 'NO_EXPENSES',
            message: 'No expenses found to generate Trip Wrapped story.',
          },
          { status: 400 }
        );
      }

      const systemInstruction = `You are the witty, observant, warm group storyteller for a Spotify Wrapped style roadtrip recap for ${destination}.

STRICT MANDATORY POLICY — ZERO FINANCIAL JUDGEMENT:
1. Every member of this group shares ALL trip costs 100% EQUALLY at the end!
2. Upfront card swipes or cash payments were purely logistical (whoever had cash or connectivity at the counter).
3. NEVER judge, rank, shame, or mock any friend for how much money they spent, paid, or didn't pay upfront.
4. DO NOT call anyone "cheap", "minimalist spender", "freeloader", "debtor", or praise anyone for having "more money".
5. Every single member award ("memberSuperlatives") MUST be 100% focused on ROADTRIP PERSONALITY, TRAVEL HABITS, ENERGY, AND HUMOR (e.g., "The Master Route Navigator", "The Dhaba Connoisseur", "The Aux Cable DJ", "The Golden Hour Photographer", "The Highway Snack Auditor", "The Mountain Philosopher", "The Early Morning Scout", "The 100% Equal Split Champion").
6. Chapter 3 MUST celebrate "The Equal Split Fellowship": highlighting that all friends share equally down to the rupee, celebrating lifelong brotherhood and zero money tension.

Return valid JSON matching:
{
  "vibeTitle": "3-5 word clever theme for this group's roadtrip vibe (e.g. 'The Mountain Mist Highway Fellowship')",
  "catchphrase": "Punchy 1-sentence recap of the trip's legendary memories & equal sharing",
  "totalSpendFormatted": "Total formatted spend string",
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "The Roadtrip Chronicles & Vibe",
      "icon": "🏔️",
      "story": "2-3 paragraphs analyzing the journey, where the crew traveled, dominant categories (food, dhabas, fuel, scenic spots), and group spirit.",
      "statBadges": ["Total spend investment", "Bills logged", "Top adventure category"]
    },
    {
      "chapterNumber": 2,
      "title": "Peak Feasts & Highway Milestones",
      "icon": "⚡",
      "story": "Story of the most memorable group feasts, biggest team activities, scenic road moments, and high spirits.",
      "statBadges": ["Average equal share per friend", "Group milestone"]
    },
    {
      "chapterNumber": 3,
      "title": "The Equal Split Fellowship & Brotherhood",
      "icon": "🤝",
      "story": "Warm, uplifting story celebrating 100% equal sharing between all friends, zero financial tension, and unforgettable roadtrip memories.",
      "statBadges": ["100% Equal Split Homies", "Zero Judgement Zone", "Lifelong Friends"]
    }
  ],
  "memberSuperlatives": [
    {
      "memberName": "Name of member",
      "awardTitle": "Affectionate personality award (e.g. 'The Master Route Navigator', 'The Golden Hour Photographer', 'The Dhaba Connoisseur')",
      "reason": "Fun behavioral/roadtrip reason celebrating their energy, habits, or navigation (NEVER about money or upfront payments)"
    }
  ]
}`;

      const prompt = `Analyze this group trip: "${tripName}" in ${destination}.
Total Spend: ${summary.currency} ${summary.totalSpend} across ${summary.expenseCount} bills.
Top Categories: ${JSON.stringify(summary.topCategories)}.
All Members: ${(summary.balances || []).map((b: any) => b.memberName).join(', ')}.
Sample Activities: ${JSON.stringify(summary.expenses.slice(0, 15))}.

IMPORTANT REMINDER: All friends share 100% equally! Assign superlatives purely for travel personality, navigation, music, food love, and roadtrip vibes. Zero money-based awards!`;

      if (apiKey) {
        try {
          const result = await callGeminiApi(apiKey, prompt, systemInstruction, true);
          const parsed = cleanJsonParse(result);
          if (parsed && Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
            return NextResponse.json({ success: true, data: parsed });
          }
        } catch (apiErr: any) {
          console.warn('Gemini trip_wrapped failed, using local smart generator:', apiErr.message);
        }
      }

      // High-quality local storyteller fallback
      const fallbackStory = generateFallbackTripWrapped(summary, tripName, destination);
      return NextResponse.json({ success: true, data: fallbackStory, isFallback: true });
    }

    // ── 5. FREE-FORM TOUR GUIDE CHAT ──
    if (action === 'chat') {
      const destination = body.destination || 'Koraput, Odisha';
      const chatMessages = body.chatMessages || [];
      const userMessage = body.customPrompt || chatMessages[chatMessages.length - 1]?.content || 'Hello!';

      const systemInstruction = `You are an expert local guide and travel concierge for ${destination}.
Help travelers with real insider knowledge about temples, opening hours, viewpoints, dress codes, highway dhabas, road conditions, and local customs.
Keep replies friendly, practical, and direct with bullet points where useful.`;

      if (apiKey) {
        try {
          const result = await callGeminiApi(apiKey, userMessage, systemInstruction, false);
          return NextResponse.json({ success: true, text: result });
        } catch (apiErr: any) {
          console.warn('Gemini chat failed, using fallback response:', apiErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        text: `Namaste! Exploring ${destination} is an unforgettable experience! Here are quick insider tips:\n• Best sunrise: Deomali Peak (reach by 5:30 AM).\n• Must-try food: Mandia Jau, Desi Kukkuda (country chicken), and freshly roasted single-origin Koraput coffee.\n• Waterfalls: Duduma Falls is majestic, while Rani Duduma is calm and secluded.\n• Road tip: Keep cash handy for forest checkpoints and village fruit stalls where phone signals dip!`,
      });
    }

    return NextResponse.json({ error: 'INVALID_ACTION', message: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in /api/gemini route:', error);
    return NextResponse.json(
      {
        error: 'GEMINI_ERROR',
        message: error.message || 'Internal error while processing Gemini AI request.',
      },
      { status: 500 }
    );
  }
}
