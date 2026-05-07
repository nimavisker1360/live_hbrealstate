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
  agentId?: string;
  agentImage?: string;
  agentPhone?: string;
  id: string;
  roomId: string;
  propertyId: string;
  title: string;
  location: string;
  image: string;
  price: string;
  agent: string;
  agentSpecialty?: string;
  agentWhatsapp?: string;
  status: "Available" | "Processing" | "Draft";
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
