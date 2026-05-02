import type { DashboardMetric, LiveTour, Property } from "@/types/platform";

export const properties: Property[] = [
  {
    id: "palm-residence",
    title: "Palm Residence Sky Villa",
    location: "Dubai Marina, UAE",
    price: "$4,850,000",
    beds: 5,
    baths: 6,
    sqft: "6,420",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80",
    tags: ["Private lift", "Sea view", "Concierge"],
  },
  {
    id: "bosphorus-house",
    title: "Bosphorus Glass House",
    location: "Bebek, Istanbul",
    price: "$7,200,000",
    beds: 6,
    baths: 7,
    sqft: "8,100",
    image:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=80",
    tags: ["Waterfront", "Spa suite", "Garden"],
  },
  {
    id: "chelsea-loft",
    title: "Chelsea Collector Loft",
    location: "London, UK",
    price: "$3,450,000",
    beds: 3,
    baths: 4,
    sqft: "3,250",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80",
    tags: ["Gallery walls", "Roof deck", "Smart home"],
  },
];

export const liveTours: LiveTour[] = [
  {
    id: "tour-001",
    roomId: "palm-residence-live",
    propertyId: "palm-residence",
    title: "Palm Residence Sky Villa",
    location: "Dubai Marina, UAE",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80",
    price: "$4,850,000",
    agent: "Selin Kaya",
    status: "Live",
    viewers: 128,
    startsAt: "Now",
    duration: "42 min",
    featured: true,
  },
  {
    id: "tour-002",
    roomId: "bosphorus-house-preview",
    propertyId: "bosphorus-house",
    title: "Bosphorus Glass House",
    location: "Bebek, Istanbul",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=80",
    price: "$7,200,000",
    agent: "Mert Aydin",
    status: "Starting Soon",
    viewers: 42,
    startsAt: "18:30",
    duration: "30 min",
  },
  {
    id: "tour-003",
    roomId: "chelsea-loft-evening",
    propertyId: "chelsea-loft",
    title: "Chelsea Collector Loft",
    location: "London, UK",
    image:
      "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=1400&q=80",
    price: "$3,450,000",
    agent: "Nadia Hart",
    status: "Scheduled",
    viewers: 0,
    startsAt: "Tomorrow 12:00",
    duration: "25 min",
  },
];

export const platformMetrics: DashboardMetric[] = [
  { label: "Live viewers", value: "1,284", detail: "+18% this week" },
  { label: "Qualified leads", value: "356", detail: "82 high intent" },
  { label: "Tours hosted", value: "74", detail: "12 closing follow-ups" },
];

export const agentMetrics: DashboardMetric[] = [
  { label: "Today viewers", value: "428", detail: "Across 3 live rooms" },
  { label: "Lead requests", value: "37", detail: "9 booked callbacks" },
  { label: "Avg. watch time", value: "16m", detail: "+4m vs last week" },
];

export const adminMetrics: DashboardMetric[] = [
  { label: "Active rooms", value: "18", detail: "5 premium listings" },
  { label: "Agents online", value: "42", detail: "7 awaiting review" },
  { label: "Monthly revenue", value: "$186k", detail: "+22% projected" },
];

export const chatPreview = [
  "Can we see the primary suite balcony?",
  "Is the furniture package included?",
  "Please show the evening view from the terrace.",
];
