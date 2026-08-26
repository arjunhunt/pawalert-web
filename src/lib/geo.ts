/**
 * Calculates distance in meters between two lat/lng coordinates using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return "Distance unknown";
  if (meters < 1000) {
    return `${Math.round(meters)} m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
}

export function formatTimeAgo(timestampString: string): string {
  const date = new Date(timestampString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export interface DetailedAddress {
  pincode: string;
  area: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  fullAddress: string;
}

export async function reverseGeocodeDetailed(
  lat: number,
  lng: number
): Promise<DetailedAddress> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );
    if (!res.ok) throw new Error("Geocoding failed");
    const data = await res.json();
    const addr = data.address || {};

    const pincode = addr.postcode || "";
    const area = addr.suburb || addr.neighbourhood || addr.residential || "";
    const street = addr.road || addr.pedestrian || addr.footway || "";
    const city = addr.city || addr.town || addr.village || addr.county || "";
    const state = addr.state || "";

    const parts: string[] = [];
    if (street) parts.push(street);
    if (area) parts.push(area);
    if (city) parts.push(city);
    if (state) parts.push(state);

    const fullAddress =
      parts.length > 0
        ? parts.join(", ")
        : data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;

    return {
      pincode,
      area,
      street,
      landmark: "",
      city,
      state,
      fullAddress,
    };
  } catch (e) {
    return {
      pincode: "",
      area: "",
      street: "",
      landmark: "",
      city: "",
      state: "",
      fullAddress: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
    };
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const detailed = await reverseGeocodeDetailed(lat, lng);
  return detailed.fullAddress;
}
