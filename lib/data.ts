const SUNDAY_SERVICE_DATES_2026 = [
  "2026-07-19",
  "2026-07-26",
  "2026-08-02",
  "2026-08-09",
  "2026-08-16",
  "2026-08-23",
  "2026-08-30",
  "2026-09-06",
  "2026-09-13",
  "2026-09-20",
  "2026-09-27",
  "2026-10-04",
  "2026-10-11",
  "2026-10-18",
  "2026-10-25",
  "2026-11-01",
  "2026-11-08",
  "2026-11-15",
  "2026-11-22",
  "2026-11-29",
  "2026-12-06",
  "2026-12-13",
  "2026-12-20",
  "2026-12-27",
];

const COLUMBIA_SKIP_DATES = new Set([
  "2026-08-02",
  "2026-09-06",
  "2026-10-04",
  "2026-11-01",
  "2026-11-22",
  "2026-12-20",
  "2026-12-27",
]);

export const announcements = [
  {
    id: 1,
    title: "Post-Retreat Praise & Worship Night",
    date: "Friday, July 24, 2026 · 7:30 PM",
    isPinned: true,
    summary: "Community Gathering",
    body: "Join us for an evening of praise, reflection, and fellowship as we continue sharing the grace and joy of the summer retreat together.",
    posterSrc: "/announcement-ne-regional-retreat.png",
    posterAlt: "Post-Retreat Praise and Worship Night poster",
    reactionCount: 18,
  },
  {
    id: 2,
    title: "Is Freedom from Porn Possible?",
    date: "Friday, July 24, 2026 · 7:30 PM",
    isPinned: false,
    summary: "Seminar",
    body: "A seminar evening focused on hope, restoration, and practical support for those seeking freedom.",
    posterSrc: "/seminar-poster.png",
    posterAlt: "Is Freedom from Porn Possible seminar poster",
    reactionCount: 9,
  },
];

export const prayerTopics = [
  {
    id: 1,
    title: "Healing and strength for members",
    date: "2026.07.18",
    body: "M. Joseph Han, M. James S. Kim, M. Ruth Lim, and Peter Song's family",
    followUp: "M. Ruth Lim is recovering steadily and is thankful for the community's continued prayers.",
  },
  {
    id: 2,
    title: "HBF Belize summer mission trip",
    date: "2026.07.18",
    body: "Please pray for safe preparation, wise planning, and all needed support to come together.",
    followUp: "The team has begun final preparations, and several practical needs have already been met.",
  },
];

export const bibleStudyPosts = [
  {
    id: 1,
    title: "This week's Bible study questions",
    scripture: "Philippians 4:4-7",
    date: "2026.07.18",
    questions: [
      "Why does Paul repeat the call to rejoice?",
      "What might it look like to turn anxiety into prayer in everyday life?",
      "What does it mean for God's peace to guard our hearts and minds?",
    ],
  },
];

export const socialPosts = [
  {
    id: 1,
    title: "Celebrations and graduation",
    date: "July 5, 2026",
    summary:
      "Jimmy Kim passed the radiology tech exam (ARRT). Joel Kim passed the Nursing Licensing Exam (NCLEX). M. Paula Yang's Graduation.",
    imageLabel: "Missionary Paula Yang graduation with church members",
    imageSrcs: ["/community-update-paula-graduation.png"],
    reactionCount: 14,
    link: "https://www.instagram.com/",
  },
  {
    id: 2,
    title: "Daniel Kim's Graduation & Farewell",
    date: "June 28, 2026",
    summary: "",
    imageLabel: "Daniel Kim graduation and farewell gathering",
    imageSrcs: ["/community-update-daniel-graduation.png", "/community-update-farewell.jpg"],
    reactionCount: 22,
    link: "https://www.instagram.com/",
  },
];

export type SampleEvent = {
  id: string;
  title: string;
  summary: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  locationName: string | null;
  locationAddress: string | null;
  category?: string;
  posterSrc?: string;
  posterAlt?: string;
  isLiveStream?: boolean;
  liveStreamUrl?: string | null;
  variant?: "featured" | "service-pair" | "united-service";
  services?: Array<{ title: string; time: string }>;
  reactionCount?: number;
};

const worshipServiceEvents: SampleEvent[] = SUNDAY_SERVICE_DATES_2026.map((date) => {
  const hasColumbiaService = !COLUMBIA_SKIP_DATES.has(date);

  if (hasColumbiaService) {
    return {
      id: `worship-service-${date}`,
      title: "Worship Service",
      summary: "Queens and Columbia worship services for the same Sunday.",
      description: "Join the church family for Sunday worship in Queens or Columbia, depending on which location is most helpful for you that week.",
      startsAt: `${date}T11:00:00-04:00`,
      endsAt: `${date}T18:15:00-04:00`,
      locationName: "Queens and Columbia",
      locationAddress: null,
      variant: "service-pair",
      services: [
        { title: "Queens", time: "11AM" },
        { title: "Columbia", time: "5PM" },
      ],
    };
  }

  return {
    id: `united-service-${date}`,
    title: "United Service",
    summary: "A combined worship service for the whole church family.",
    description: "This Sunday will be a united service, with the church gathering together in one place for worship and fellowship.",
    startsAt: `${date}T11:00:00-04:00`,
    endsAt: `${date}T13:00:00-04:00`,
    locationName: "Queens",
    locationAddress: null,
    variant: "united-service",
  };
});

export const sampleEvents: SampleEvent[] = [
  {
    id: "post-retreat-praise-worship-night",
    title: "Post-Retreat Praise & Worship Night",
    summary: "An evening of praise, testimony, and fellowship after the regional summer retreat.",
    description: "Come share reflections, encourage one another, and continue the fellowship from the retreat in a simple, joyful evening together.",
    startsAt: "2026-07-24T19:30:00-04:00",
    endsAt: "2026-07-24T21:00:00-04:00",
    locationName: "NY UBF Worship Hall",
    locationAddress: null,
    category: "Gathering",
    posterSrc: "/announcement-ne-regional-retreat.png",
    posterAlt: "Post-Retreat Praise and Worship Night poster",
    variant: "featured" as const,
  },
  {
    id: "is-freedom-from-porn-possible",
    title: "Is Freedom from Porn Possible?",
    summary: "A seminar evening centered on hope, honesty, and practical encouragement.",
    description: "A thoughtful seminar for anyone who wants to understand the topic more clearly and hear a message of hope and freedom.",
    startsAt: "2026-07-24T19:30:00-04:00",
    endsAt: "2026-07-24T21:00:00-04:00",
    locationName: "NY UBF Worship Hall",
    locationAddress: null,
    category: "Seminar",
    posterSrc: "/seminar-poster.png",
    posterAlt: "Is Freedom from Porn Possible seminar poster",
    variant: "featured" as const,
  },
  ...worshipServiceEvents,
].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
