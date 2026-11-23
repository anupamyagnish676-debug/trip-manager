/**
 * Friendly Trip Banter & Roast Engine
 * Designed for group road trips: Playful, affectionate humor among friends.
 * STRICT POLICY: Zero financial judgement. Emphasizes that all friends share equally at the end!
 */

export interface MemberRoast {
  title: string;
  emoji: string;
  dialogue: string;
  punchline: string;
}

export const FRIENDLY_ROASTS: MemberRoast[] = [
  {
    title: 'The 1% Battery Magician',
    emoji: '🪫',
    dialogue: '"Bhai phone switch off hone wala hai, tu de de main room pe jaake pakka karta hu!"',
    punchline: 'Phone miraculously resurrected 5 minutes later with 85% battery to shoot 4K Instagram reels.',
  },
  {
    title: 'The Network Issue Specialist',
    emoji: '📶',
    dialogue: '"Bhai yahan Airtel/Jio ka tower hi nahi aa raha, gol-gol ghoom raha hai!"',
    punchline: 'Simultaneously streaming Spotify in high-res and receiving WhatsApp stickers with zero lag.',
  },
  {
    title: 'The Mandia Jau & Chicken Auditor',
    emoji: '🍗',
    dialogue: '"Bhai extra piece kaun khayega? Chalo main waste nahi hone deta!"',
    punchline: 'Polished off 40% of the highway dhaba feast, currently waiting for IMF clearance to scan the UPI QR.',
  },
  {
    title: 'The UPI Ghost',
    emoji: '👻',
    dialogue: '"QR code kahan hai bhai? Arey abhi toh yahi tha..."',
    punchline: 'Seen laughing at the table 10 seconds ago, completely vanished into thin air the moment the bill arrived.',
  },
  {
    title: 'The Chill Philosopher',
    emoji: '🧘',
    dialogue: '"Paisa toh haath ka mail hai bro, dosti se badhke thodi na kuch hai!"',
    punchline: 'Spiritual enlightenment hits peak levels right when the waiter stands at the table.',
  },
  {
    title: 'The Pocket Search Champion',
    emoji: '🕵️',
    dialogue: '"Ruk ruk main cash nikal raha hu... arey wallet kis bag mein chala gaya?"',
    punchline: 'Thoroughly checked 12 zipper pockets, finding 3 old toll tickets, 1 mint, and zero rupee notes.',
  },
  {
    title: 'The "Raat Ko Pakka" Legend',
    emoji: '🌙',
    dialogue: '"Bhai raat ko hotel pahunch ke ek saath pura hisab clear kar dunga!"',
    punchline: 'Currently fast asleep under the blanket at 9:30 PM while the finance lead is balancing the ledger.',
  },
  {
    title: 'The Round Figure Enthusiast',
    emoji: '🧮',
    dialogue: '"₹417.80? Arey bhai seedha ₹400 pakad na, round figure karte hain!"',
    punchline: 'Nobel-prize worthy mental math applied exclusively to round dues down, never up.',
  },
  {
    title: 'The 5G Speedrun Walker',
    emoji: '🏃',
    dialogue: '"Main gaadi start karke AC chala deta hu, tab tak tum bill dekh lo!"',
    punchline: 'Fastest 100-meter dash in human history executed from the restaurant table to the parking lot.',
  },
  {
    title: 'The Screenshot Archeologist',
    emoji: '📸',
    dialogue: '"Bhai maine bhej diya tha subah, bank SMS thoda late aata hai!"',
    punchline: 'Shares a blurry payment screenshot from a tea stall in 2024 with a green tick sticker.',
  },
];

/**
 * Returns a playful roast deterministically based on member ID and optional shuffle index.
 */
export function getRoastForMember(
  memberId: string,
  memberName: string,
  amountOwed: number,
  shuffleIndex: number = 0
): MemberRoast {
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    hash = (hash << 5) - hash + memberId.charCodeAt(i);
    hash |= 0;
  }
  const baseIndex = Math.abs(hash + shuffleIndex) % FRIENDLY_ROASTS.length;
  return FRIENDLY_ROASTS[baseIndex];
}

/**
 * Generates an affectionate WhatsApp message with the playful roast and clear equal-sharing disclaimer.
 */
export function getWhatsAppRoastShareText(
  tripName: string,
  friendName: string,
  amount: number,
  roast: MemberRoast,
  currency: string = 'INR'
): string {
  const formattedAmount = `${currency === 'INR' ? '₹' : currency + ' '}${amount.toLocaleString('en-IN')}`;
  
  return encodeURIComponent(
    `🚨 *OFFICIAL TRIP ROAST ALERT* 🚨\n` +
    `Trip: *${tripName}*\n\n` +
    `🎭 *Target:* ${friendName}\n` +
    `🏆 *Title Earned:* ${roast.emoji} *${roast.title}*\n\n` +
    `💬 *Famous Dialogue:* ${roast.dialogue}\n` +
    `💡 *Ground Reality:* ${roast.punchline}\n\n` +
    `💸 *Pending Share:* ${formattedAmount}\n\n` +
    `❤️ *FRIENDSHIP DISCLAIMER:* Zero judgement bro! We know we are all sharing equally at the end like true homies — but until that QR is scanned, you are officially in the Hall of Fame! 🍿😂`
  );
}
