import { FeedingSpot } from "./types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export const INITIAL_FEEDING_SPOTS: FeedingSpot[] = [
  {
    id: "feed-spot-1",
    name: "Railway Station Auto Stand Pack",
    dog_count: 6,
    puppy_count: 2,
    area: "Station Road",
    city: "Umargam",
    address: "Outside Platform 1 Auto Stand, Station Road",
    landmark: "Behind the tea stall & banyan tree",
    latitude: 20.1812,
    longitude: 72.7615,
    dietary_notes: "6 friendly adults love rice with pedigree/eggs; 2 puppies need warm milk/curd.",
    last_fed_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago (Fed)
    last_fed_by: "Arjun (Volunteer)",
    created_by: "community",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "feed-spot-2",
    name: "Devdham Market Circle Pack",
    dog_count: 5,
    puppy_count: 0,
    area: "Devdham",
    city: "Umargam",
    address: "Near Devdham Vegetable Market Circle",
    landmark: "Opposite Apollo Pharmacy, near corner tree",
    latitude: 20.1759,
    longitude: 72.7549,
    dietary_notes: "5 gentle street dogs. Feed near the closed shutter side away from main traffic.",
    last_fed_at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), // 22 hours ago (Needs food)
    last_fed_by: "Sneha",
    created_by: "community",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    id: "feed-spot-3",
    name: "Hanuman Temple Garden Pack",
    dog_count: 8,
    puppy_count: 3,
    area: "Temple Circle",
    city: "Umargam",
    address: "Temple Garden North Boundary Wall",
    landmark: "Under the large mango tree near water cooler",
    latitude: 20.1724,
    longitude: 72.7488,
    dietary_notes: "8 calm community strays and 3 pups. Fresh clean water pot is kept under the tree.",
    last_fed_at: null, // Never logged today (Needs food)
    last_fed_by: null,
    created_by: "community",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
  },
];

const STORAGE_KEY = "pawalert_feeding_spots";

/**
 * Evaluates whether a feeding spot is fed within the current active cycle (last 18 hours).
 */
export function isSpotFedToday(lastFedAt?: string | null): boolean {
  if (!lastFedAt) return false;
  const fedTime = new Date(lastFedAt).getTime();
  if (isNaN(fedTime)) return false;
  const diffHours = (Date.now() - fedTime) / (1000 * 60 * 60);
  return diffHours < 18;
}

/**
 * Retrieves all stored feeding spots, seeding with starter data on first visit.
 */
export function getStoredFeedingSpots(): FeedingSpot[] {
  if (typeof window === "undefined") return INITIAL_FEEDING_SPOTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FEEDING_SPOTS));
      return INITIAL_FEEDING_SPOTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_FEEDING_SPOTS;
  } catch (e) {
    return INITIAL_FEEDING_SPOTS;
  }
}

/**
 * Saves a new community feeding spot.
 */
export function saveFeedingSpot(
  spotData: Omit<FeedingSpot, "id" | "created_at">
): FeedingSpot {
  const newSpot: FeedingSpot = {
    ...spotData,
    id: `spot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const all = getStoredFeedingSpots();
    const updated = [newSpot, ...all];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return newSpot;
}

/**
 * Logs a feeding event on a spot ("Marked as Fed Today").
 */
export function logFeedingEvent(
  spotId: string,
  feederName: string
): FeedingSpot[] {
  if (typeof window === "undefined") return INITIAL_FEEDING_SPOTS;
  const all = getStoredFeedingSpots();
  const updated = all.map((spot) => {
    if (spot.id === spotId) {
      return {
        ...spot,
        last_fed_at: new Date().toISOString(),
        last_fed_by: feederName || "Community Feeder",
      };
    }
    return spot;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Deletes a feeding spot (author / admin only).
 */
export function deleteFeedingSpot(spotId: string): FeedingSpot[] {
  if (typeof window === "undefined") return INITIAL_FEEDING_SPOTS;
  const all = getStoredFeedingSpots();
  const updated = all.filter((s) => s.id !== spotId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
