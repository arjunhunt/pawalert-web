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

/**
 * Generates the fastest, most direct Google Maps Turn-by-Turn GPS Navigation URL.
 * Automatically injects:
 * 1. Exact destination coordinates (high-precision sub-meter lock)
 * 2. Origin coordinates (user's live GPS location) to ensure Google Maps calculates the shortest path immediately
 * 3. dir_action=navigate to immediately start real-time traffic-optimized GPS guidance
 * 4. travelmode=driving to find the fastest route
 */
export function getFastestNavigationUrl(
  destLat: number,
  destLng: number,
  originLat?: number | null,
  originLng?: number | null,
  mode: "driving" | "two-wheeler" | "walking" = "driving"
): string {
  const cleanDestLat = Number(destLat).toFixed(6);
  const cleanDestLng = Number(destLng).toFixed(6);

  // If user origin GPS coordinates are available, pass origin for instant pinpoint shortest route
  if (
    originLat !== undefined &&
    originLat !== null &&
    originLng !== undefined &&
    originLng !== null &&
    originLat !== 0 &&
    originLng !== 0
  ) {
    const cleanOriginLat = Number(originLat).toFixed(6);
    const cleanOriginLng = Number(originLng).toFixed(6);
    return `https://www.google.com/maps/dir/?api=1&origin=${cleanOriginLat},${cleanOriginLng}&destination=${cleanDestLat},${cleanDestLng}&travelmode=${mode}&dir_action=navigate`;
  }

  // Fallback: Launch turn-by-turn navigation directly to target destination from current GPS
  return `https://www.google.com/maps/dir/?api=1&destination=${cleanDestLat},${cleanDestLng}&travelmode=${mode}&dir_action=navigate`;
}

export function formatTimeAgo(timestampString?: string | null): string {
  if (!timestampString) return "Just now";
  const date = new Date(timestampString);
  if (isNaN(date.getTime())) return "Recently";
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
 * High-Precision GPS Lock with Instant Permission Trigger & Progressive Convergence.
 * Solves mobile permission timeouts and gets real coordinates reliably across all devices.
 */
export function getAccurateGPSPosition(
  forceRefresh: boolean = false,
  maxWaitMs: number = 10000
): Promise<{ lat: number; lng: number; accuracy: number; error?: string } | null> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ lat: 0, lng: 0, accuracy: 9999, error: "Geolocation is not supported on this browser." });
  }

  return new Promise((resolve) => {
    let resolved = false;

    const finish = (result: { lat: number; lng: number; accuracy: number; error?: string }) => {
      if (resolved) return;
      resolved = true;
      if (result.lat !== 0 && result.lng !== 0) {
        cacheCoordinates(result.lat, result.lng, result.accuracy);
      }
      resolve(result);
    };

    // Safety timeout
    const timer = setTimeout(() => {
      if (!resolved) {
        finish({ lat: 0, lng: 0, accuracy: 9999, error: "GPS timed out. Please tap Locate Me again." });
      }
    }, maxWaitMs + 3000);

    // 1. Primary: Request high-accuracy GPS satellite fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        finish({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 15),
        });
      },
      (err) => {
        console.warn("Primary GPS notice, attempting resilient lock:", err.code, err.message);
        // If high accuracy times out (e.g. indoors or under roof), fallback to network fix
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            finish({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 45),
            });
          },
          (err2) => {
            clearTimeout(timer);
            let errMsg = "Could not detect device location.";
            if (err2.code === 1 || err.code === 1) {
              errMsg = "Location permission denied. Please allow location access in your browser.";
            } else if (err2.code === 2 || err.code === 2) {
              errMsg = "Location unavailable. Please turn on device Location / GPS in settings.";
            } else if (err2.code === 3 || err.code === 3) {
              errMsg = "Location request timed out. Please tap Locate Me again.";
            }
            finish({ lat: 0, lng: 0, accuracy: 9999, error: errMsg });
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: forceRefresh ? 0 : 30000 }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: maxWaitMs,
        maximumAge: forceRefresh ? 0 : 5000,
      }
    );
  });
}

export async function getDeviceGeolocation(forceRefresh: boolean = false): Promise<{ lat: number; lng: number; accuracy?: number; error?: string } | null> {
  return getAccurateGPSPosition(forceRefresh, 10000);
}

export async function getResilientGeolocation(forceRefresh: boolean = false): Promise<{ lat: number; lng: number } | null> {
  const res = await getDeviceGeolocation(forceRefresh);
  if (res && res.lat !== 0 && res.lng !== 0) {
    return { lat: res.lat, lng: res.lng };
  }
  return getCachedCoordinates();
}

export function clearCachedCoordinates(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("pawalert_user_lat");
    localStorage.removeItem("pawalert_user_lng");
    localStorage.removeItem("pawalert_user_accuracy");
    localStorage.removeItem("pawalert_user_geo_time");
  } catch (e) {}
}

export function cacheCoordinates(lat: number, lng: number, accuracy?: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("pawalert_user_lat", lat.toString());
    localStorage.setItem("pawalert_user_lng", lng.toString());
    if (accuracy) {
      localStorage.setItem("pawalert_user_accuracy", accuracy.toString());
    }
    localStorage.setItem("pawalert_user_geo_time", Date.now().toString());
  } catch (e) {
    // Ignore storage errors
  }
}

export function getCachedCoordinates(): { lat: number; lng: number; accuracy?: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const latStr = localStorage.getItem("pawalert_user_lat");
    const lngStr = localStorage.getItem("pawalert_user_lng");
    const accStr = localStorage.getItem("pawalert_user_accuracy");
    if (latStr && lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      const accuracy = accStr ? parseFloat(accStr) : undefined;
      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat !== 0 &&
        lng !== 0 &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        !(Math.abs(lat - 20.1759) < 0.005 && Math.abs(lng - 72.7549) < 0.005)
      ) {
        return { lat, lng, accuracy };
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


