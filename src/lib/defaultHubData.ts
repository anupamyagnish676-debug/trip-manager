import { ItineraryDay, TransportTicket, CabRentalLogistics, TripAward, Member } from '@/types';

export function getDefaultItineraryDays(members: Member[]): ItineraryDay[] {
  const lead1 = members[0]?.id || '';
  const lead2 = members[1]?.id || members[0]?.id || '';
  const lead3 = members[2]?.id || members[0]?.id || '';

  return [
    {
      dayNumber: 1,
      date: '2026-11-25',
      title: 'Arrival, Puri Golden Beach & Sun Temple',
      activities: [
        {
          id: 'act-1-1',
          time: '07:00 AM',
          title: 'Sunrise Walk at Puri Golden Beach',
          location: 'Golden Beach, Puri, Odisha',
          notes: 'Blue Flag certified beach. Don\'t forget sunscreen and beach slippers.',
          status: 'completed',
          leadMemberId: lead1,
        },
        {
          id: 'act-1-2',
          time: '10:30 AM',
          title: 'Shri Jagannath Temple Darshan',
          location: 'Shree Jagannath Temple, Puri, Odisha',
          notes: 'Dress code reminder: Traditional Indian attire only. Leather wallets, belts, and phones strictly prohibited inside temple gates.',
          status: 'completed',
          leadMemberId: lead2,
        },
        {
          id: 'act-1-3',
          time: '02:00 PM',
          title: 'Odia Seafood & Thali Lunch at Chilika Dhaba',
          location: 'Chilika Dhaba, Barkul / Puri Highway',
          notes: 'Special fresh crab curry, prawn roast, and authentic Odia veg thali.',
          status: 'in_progress',
          leadMemberId: lead3,
        },
        {
          id: 'act-1-4',
          time: '05:00 PM',
          title: 'Konark Sun Temple Light & Sound Show',
          location: 'Konark Sun Temple, Puri District, Odisha',
          notes: 'UNESCO World Heritage Site. Pre-booked group tickets entry at Gate 2.',
          status: 'upcoming',
          leadMemberId: lead1,
        },
      ],
    },
    {
      dayNumber: 2,
      date: '2026-11-26',
      title: 'Chilika Lake & Marine Drive Expedition',
      activities: [
        {
          id: 'act-2-1',
          time: '08:00 AM',
          title: 'Satapada Boat Cruise & Dolphin Spotting',
          location: 'Satapada Chilika Lake Jetty, Odisha',
          notes: 'Irrawaddy dolphin sanctuary lagoon safari. Life jackets mandatory.',
          status: 'upcoming',
          leadMemberId: lead2,
        },
        {
          id: 'act-2-2',
          time: '01:30 PM',
          title: 'Sea Mouth Island Crab Feast',
          location: 'Chilika Sea Mouth Island, Satapada',
          notes: 'Local islanders cook live fried fish and jumbo tiger prawns on the shore.',
          status: 'upcoming',
          leadMemberId: lead3,
        },
        {
          id: 'act-2-3',
          time: '05:30 PM',
          title: 'Puri-Konark Marine Drive Sunset Cruise & Cafe',
          location: 'Marine Drive Road, Puri to Konark, Odisha',
          notes: 'Scenic beach highway stretch with sea-facing coconut stalls.',
          status: 'upcoming',
          leadMemberId: lead1,
        },
      ],
    },
    {
      dayNumber: 3,
      date: '2026-11-27',
      title: 'Bhubaneswar Heritage & Grand Farewell',
      activities: [
        {
          id: 'act-3-1',
          time: '09:30 AM',
          title: 'Dhauli Shanti Stupa & Lingaraj Temple',
          location: 'Dhauli Peace Pagoda, Bhubaneswar, Odisha',
          notes: 'Historic Kalinga war peace stupa with panoramic Daya river view.',
          status: 'upcoming',
          leadMemberId: lead2,
        },
        {
          id: 'act-3-2',
          time: '01:00 PM',
          title: 'Farewell Odia Lunch & Ekamra Haat Shopping',
          location: 'Ekamra Haat, Bhubaneswar, Odisha',
          notes: 'Authentic handicrafts, silver filigree work (Tarakasi), and Pattachitra paintings.',
          status: 'upcoming',
          leadMemberId: lead3,
        },
        {
          id: 'act-3-3',
          time: '06:00 PM',
          title: 'Commute to Biju Patnaik Airport / Railway Station',
          location: 'Biju Patnaik International Airport (BBI), Bhubaneswar',
          notes: 'Final luggage check and departure for home.',
          status: 'upcoming',
          leadMemberId: lead1,
        },
      ],
    },
  ];
}

export function getDefaultTransportTickets(): TransportTicket[] {
  return [
    {
      id: 'ticket-1',
      mode: 'train',
      title: 'Purushottam Express (12801)',
      pnr: '245-8971203',
      departureStation: 'Kharagpur Jn (KGP)',
      arrivalStation: 'Puri Terminus (PURI)',
      departureTime: '06:15 AM',
      arrivalTime: '01:45 PM',
      seatsOrBerths: 'Coach B3, Berths 21, 22, 23, 24',
      liveStatusUrl: 'https://www.railyatri.in/live-train-status/12801',
    },
    {
      id: 'ticket-2',
      mode: 'flight',
      title: 'IndiGo 6E-5212',
      pnr: 'W8Q4KZ',
      departureStation: 'Bhubaneswar T1 (BBI)',
      arrivalStation: 'New Delhi T2 (DEL)',
      departureTime: '08:45 PM',
      arrivalTime: '11:05 PM',
      seatsOrBerths: 'Seats 14A, 14B, 14C, 14D',
      liveStatusUrl: 'https://www.goindigo.in/flight-status.html',
    },
  ];
}

export function getDefaultCabLogistics(): CabRentalLogistics {
  return {
    vehicleModel: 'Toyota Innova Crysta (7-Seater AC)',
    plateNumber: 'OD 02 AB 1234',
    driverName: 'Ramesh Pradhan',
    driverPhone: '+91 98765 43210',
    pickupLocation: 'Puri Railway Station / BBI Airport Exit Gate',
    pickupTime: '06:30 AM',
    notes: 'Contract: 300 km/day included with AC. Diesel tank full at start (Odometer starting reading: 45,210 km). Driver allowance: Rs. 400/night.',
  };
}

export function getDefaultAwards(): TripAward[] {
  return [
    {
      id: 'award-1',
      title: 'The Alarm Snoozer',
      icon: '👑',
      description: 'Always snoozed 10 alarms and delayed the morning departure.',
      votes: {},
    },
    {
      id: 'award-2',
      title: 'Master Photographer',
      icon: '📸',
      description: 'Shot 1,000+ candid photos, cinematic reels, and directed group poses.',
      votes: {},
    },
    {
      id: 'award-3',
      title: 'Chief Foodie',
      icon: '🍔',
      description: 'Ordered the most dishes at every dhaba and always asked "Where are we eating next?".',
      votes: {},
    },
    {
      id: 'award-4',
      title: 'Formula 1 Driver',
      icon: '🏎️',
      description: 'Masterfully conquered the Puri-Konark Marine Drive highway and beach stretches.',
      votes: {},
    },
  ];
}
