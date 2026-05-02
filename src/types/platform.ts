export type Property = {
  id: string;
  title: string;
  location: string;
  price: string;
  beds: number;
  baths: number;
  sqft: string;
  image: string;
  tags: string[];
};

export type LiveTour = {
  id: string;
  roomId: string;
  propertyId: string;
  title: string;
  location: string;
  image: string;
  price: string;
  agent: string;
  status: "Live" | "Starting Soon" | "Scheduled";
  viewers: number;
  startsAt: string;
  duration: string;
  featured?: boolean;
};

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
};
