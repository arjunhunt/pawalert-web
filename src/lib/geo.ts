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

/**
 * Ultra-resilient browser geolocation with high-accuracy GPS -> network triangulation -> IP fallback -> cached coords.
 */
export async function getResilientGeolocation(forceRefresh: boolean = false): Promise<{ lat: number; lng: number } | null> {
  // 1. Prioritize Real Hardware GPS (Sub-meter accuracy on mobile phones)
  if (typeof window !== "undefined" && "geolocation" in navigator && navigator.geolocation) {
    const tryGetPosition = (options: PositionOptions): Promise<{ lat: number; lng: number }> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            cacheCoordinates(coords.lat, coords.lng);
            resolve(coords);
          },
          (err) => reject(err),
          options
        );
      });
    };

    try {
      // Step 1: True Hardware GPS Satellites (12s timeout for accurate fix)
      return await tryGetPosition({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: forceRefresh ? 0 : 10000,
      });
    } catch (gpsError) {
      console.warn("High-accuracy GPS timed out or weak, trying fast mobile network triangulation...", gpsError);
      try {
        // Step 2: Cellular / Wi-Fi Network Triangulation (8s timeout)
        return await tryGetPosition({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: forceRefresh ? 0 : 30000,
        });
      } catch (networkError) {
        console.warn("Browser GPS failed or blocked, trying IP geolocation fallback...", networkError);
      }
    }
  }

  // 2. Only use IP-based Geolocation as an emergency last-resort if hardware GPS is unavailable or blocked
  if (!forceRefresh) {
    try {
      const ipRes = await fetch("https://freeipapi.com/api/json");
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.latitude && ipData.longitude) {
          const coords = { lat: Number(ipData.latitude), lng: Number(ipData.longitude) };
          cacheCoordinates(coords.lat, coords.lng);
          return coords;
        }
      }
    } catch (e1) {}
  }

  // 3. Fallback to cached coordinates
  return getCachedCoordinates();
}

export function cacheCoordinates(lat: number, lng: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("pawalert_user_lat", lat.toString());
    localStorage.setItem("pawalert_user_lng", lng.toString());
    localStorage.setItem("pawalert_user_geo_time", Date.now().toString());
  } catch (e) {
    // Ignore storage errors
  }
}

export function getCachedCoordinates(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const latStr = localStorage.getItem("pawalert_user_lat");
    const lngStr = localStorage.getItem("pawalert_user_lng");
    if (latStr && lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  } catch (e) {
    // Ignore storage errors
  }
  return null;
}

/**
 * Resolves a text address or city/area query into latitude & longitude coordinates.
 */
export async function forwardGeocode(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query || !query.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: { "Accept-Language": "en" },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data[0]) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  } catch (e) {
    console.warn("Forward geocoding error:", e);
  }
  return null;
}


