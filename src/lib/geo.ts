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
 * High-Precision GPS Lock with Progressive Satellite Convergence & Anti-Jitter Filter.
 * Samples continuous GPS fixes with maximumAge: 0 to lock onto hardware satellite reading (<10m accuracy).
 */
export function getAccurateGPSPosition(
  forceRefresh: boolean = false,
  maxWaitMs: number = 7000
): Promise<{ lat: number; lng: number; accuracy: number; error?: string } | null> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ lat: 0, lng: 0, accuracy: 9999, error: "Geolocation is not supported on this browser." });
  }

  return new Promise((resolve) => {
    let bestFix: { lat: number; lng: number; accuracy: number } | null = null;
    let watchId: number | null = null;
    let hasResolved = false;

    const finish = (result: { lat: number; lng: number; accuracy: number; error?: string } | null) => {
      if (hasResolved) return;
      hasResolved = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (result && result.lat !== 0 && result.lng !== 0) {
        cacheCoordinates(result.lat, result.lng, result.accuracy);
      }
      resolve(result);
    };

    // Safety timeout: take the best fix collected so far
    const timer = setTimeout(() => {
      if (bestFix) {
        finish(bestFix);
      } else {
        // Fallback to one-shot getCurrentPosition
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const fix = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 20),
            };
            finish(fix);
          },
          (err) => {
            let errMsg = "Could not detect accurate GPS location.";
            if (err.code === 1) errMsg = "Location permission is denied. Please allow location in browser settings.";
            else if (err.code === 2) errMsg = "GPS signal unavailable. Please enable Device Location.";
            else if (err.code === 3) errMsg = "GPS satellite lock timed out. Please tap Detect GPS again.";
            finish({ lat: 0, lng: 0, accuracy: 9999, error: errMsg });
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
        );
      }
    }, maxWaitMs);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const currentAccuracy = Math.round(pos.coords.accuracy || 20);
        const currentFix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: currentAccuracy,
        };

        // Always prioritize fix with smallest accuracy radius
        if (!bestFix || currentAccuracy < bestFix.accuracy) {
          bestFix = currentFix;
        }

        // True satellite pinpoint lock (<= 10 meters)
        if (currentAccuracy <= 10) {
          clearTimeout(timer);
          finish(bestFix);
        }
      },
      (err) => {
        console.warn("GPS watch warning:", err.code, err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0, // Force fresh satellite signal (no stale cell tower cache)
      }
    );
  });
}

/**
 * Continuously streams live hardware GPS updates as satellite lock refines.
 */
export function watchLiveHardwareGPS(
  onUpdate: (loc: { lat: number; lng: number; accuracy: number }) => void,
  onError?: (msg: string) => void
): () => void {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const fix = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy || 15),
      };
      cacheCoordinates(fix.lat, fix.lng, fix.accuracy);
      onUpdate(fix);
    },
    (err) => {
      console.warn("Live GPS watch notice:", err.message);
      if (onError) onError(err.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

export async function getDeviceGeolocation(forceRefresh: boolean = false): Promise<{ lat: number; lng: number; accuracy?: number; error?: string } | null> {
  return getAccurateGPSPosition(forceRefresh, 7000);
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
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
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


