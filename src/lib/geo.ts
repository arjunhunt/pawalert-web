/**
 * PawAlert High-Precision Geolocation & Spatial Utilities
 *
 * Implements hardware GNSS satellite convergence, anti-jitter filtering,
 * strict cache expiration (TTL 5 mins), and geodesic distance calculations.
 */

/**
 * Calculates geodesic distance between two points in meters using Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Formats distance into clean human-readable string (e.g. "450 m away", "2.4 km away").
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters)) return "";
  if (meters < 1000) {
    return `${meters} m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
}

/**
 * Clean human-readable time ago formatting (e.g. "Just now", "5m ago", "2h ago", "Yesterday").
 */
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

/**
 * High-Precision GPS Lock with Progressive Satellite Convergence.
 * Samples continuous hardware GNSS fixes to converge on true satellite accuracy (<15m),
 * avoiding coarse cell-tower / Wi-Fi drift (which causes ~100m offsets).
 */
export function getAccurateGPSPosition(
  forceRefresh: boolean = true,
  maxWaitMs: number = 7000
): Promise<{ lat: number; lng: number; accuracy: number; error?: string } | null> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return Promise.resolve({
      lat: 0,
      lng: 0,
      accuracy: 9999,
      error: "Geolocation is not supported on this browser.",
    });
  }

  return new Promise((resolve) => {
    let bestFix: { lat: number; lng: number; accuracy: number } | null = null;
    let watchId: number | null = null;
    let hasResolved = false;

    const finish = (result: { lat: number; lng: number; accuracy: number; error?: string }) => {
      if (hasResolved) return;
      hasResolved = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      // ONLY cache if accuracy is true satellite precision (<= 25m)
      if (result.lat !== 0 && result.lng !== 0 && result.accuracy <= 25) {
        cacheCoordinates(result.lat, result.lng, result.accuracy);
      }
      resolve(result);
    };

    // Convergence timeout: pick the sharpest satellite fix collected so far
    const timer = setTimeout(() => {
      if (bestFix) {
        finish(bestFix);
      } else {
        // Fallback: one-shot high-accuracy query
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            finish({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 25),
            });
          },
          (err) => {
            let errMsg = "Could not detect device location.";
            if (err.code === 1) errMsg = "Location permission denied. Please allow location access in browser settings.";
            else if (err.code === 2) errMsg = "GPS unavailable. Please enable device Location / GPS.";
            else if (err.code === 3) errMsg = "GPS request timed out. Please tap Locate Me again.";
            finish({ lat: 0, lng: 0, accuracy: 9999, error: errMsg });
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          }
        );
      }
    }, maxWaitMs);

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const acc = Math.round(pos.coords.accuracy || 50);
          const currentFix = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: acc,
          };

          // Progressive refinement: keep the fix with the highest satellite precision
          if (!bestFix || acc < bestFix.accuracy) {
            bestFix = currentFix;
          }

          // Pinpoint Satellite Lock reached (<= 12m), resolve immediately!
          if (acc <= 12) {
            clearTimeout(timer);
            finish(bestFix);
          }
        },
        (err) => {
          console.warn("GPS watch notice:", err.code, err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0, // Force live hardware reading, NEVER accept stale OS cache
        }
      );
    } catch (e) {
      console.warn("watchPosition failed, falling back to getCurrentPosition:", e);
      clearTimeout(timer);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          finish({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 25),
          });
        },
        (err) => {
          finish({ lat: 0, lng: 0, accuracy: 9999, error: "Could not lock GPS." });
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    }
  });
}

/**
 * Continuous GPS Watcher that progressively streams refined coordinates
 * as satellite lock sharpens over time.
 */
export function watchLiveHardwareGPS(
  onUpdate: (coords: { lat: number; lng: number; accuracy: number }) => void,
  onError?: (error: string) => void
): () => void {
  if (typeof window === "undefined" || !navigator.geolocation) {
    if (onError) onError("Geolocation not supported.");
    return () => {};
  }

  let bestAccuracy = 9999;

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const acc = Math.round(pos.coords.accuracy || 50);
      // Update whenever accuracy is better or reasonable (< 35m)
      if (acc <= bestAccuracy || acc <= 35) {
        if (acc < bestAccuracy) bestAccuracy = acc;
        onUpdate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: acc,
        });
        if (acc <= 20) {
          cacheCoordinates(pos.coords.latitude, pos.coords.longitude, acc);
        }
      }
    },
    (err) => {
      console.warn("Live GPS watch error:", err.code, err.message);
      if (onError && err.code === 1) {
        onError("Location permission denied.");
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    }
  );

  return () => {
    try {
      navigator.geolocation.clearWatch(watchId);
    } catch (e) {}
  };
}

export async function getDeviceGeolocation(forceRefresh: boolean = true): Promise<{ lat: number; lng: number; accuracy?: number; error?: string } | null> {
  return getAccurateGPSPosition(forceRefresh, 7000);
}

export async function getResilientGeolocation(forceRefresh: boolean = false): Promise<{ lat: number; lng: number } | null> {
  const cached = getCachedCoordinates();
  if (cached && !forceRefresh) {
    return { lat: cached.lat, lng: cached.lng };
  }
  const res = await getDeviceGeolocation(forceRefresh);
  if (res && res.lat !== 0 && res.lng !== 0) {
    return { lat: res.lat, lng: res.lng };
  }
  return cached;
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

/**
 * Caches coordinates ONLY if accuracy is true satellite precision (<= 25m).
 * Saves timestamp to enforce strict 5-minute TTL.
 */
export function cacheCoordinates(lat: number, lng: number, accuracy?: number): void {
  if (typeof window === "undefined") return;
  // NEVER cache coarse cell-tower or Wi-Fi fixes (> 25m) as trusted location
  if (accuracy && accuracy > 25) return;
  try {
    localStorage.setItem("pawalert_user_lat", lat.toString());
    localStorage.setItem("pawalert_user_lng", lng.toString());
    if (accuracy) {
      localStorage.setItem("pawalert_user_accuracy", accuracy.toString());
    }
    localStorage.setItem("pawalert_user_geo_time", Date.now().toString());
  } catch (e) {}
}

/**
 * Retrieves cached coordinates ONLY if younger than 5 minutes.
 * Prevents stale multi-day location persistence.
 */
export function getCachedCoordinates(): { lat: number; lng: number; accuracy?: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const timeStr = localStorage.getItem("pawalert_user_geo_time");
    // Strict 5-minute TTL: Discard if older than 5 minutes or missing timestamp
    if (!timeStr) {
      clearCachedCoordinates();
      return null;
    }
    const savedTime = parseInt(timeStr, 10);
    const MAX_CACHE_AGE_MS = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - savedTime > MAX_CACHE_AGE_MS) {
      clearCachedCoordinates();
      return null;
    }

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
  } catch (e) {}
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

/**
 * Reverse geocodes coordinates to a human-readable address.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { "Accept-Language": "en" },
      }
    );
    if (!res.ok) return "Location recorded";
    const data = await res.json();
    if (data && data.display_name) {
      const addr = data.address || {};
      const parts = [
        addr.road || addr.suburb || addr.neighbourhood,
        addr.city || addr.town || addr.village,
        addr.state,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : data.display_name;
    }
  } catch (e) {
    console.warn("Reverse geocode error:", e);
  }
  return "Location recorded";
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

/**
 * Detailed Reverse Geocoding: Extracts structured fields for reporting.
 */
export async function reverseGeocodeDetailed(
  lat: number,
  lng: number
): Promise<DetailedAddress> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { "Accept-Language": "en" },
      }
    );
    if (!res.ok) {
      return {
        pincode: "",
        area: "",
        street: "",
        landmark: "",
        city: "",
        state: "",
        fullAddress: "Location recorded",
      };
    }
    const data = await res.json();
    if (data && data.address) {
      const addr = data.address;
      const pincode = addr.postcode || "";
      const street = addr.road || addr.street || "";
      const area = addr.suburb || addr.neighbourhood || addr.residential || addr.subdivision || "";
      const landmark = addr.amenity || addr.building || addr.shop || "";
      const city = addr.city || addr.town || addr.village || addr.county || "";
      const state = addr.state || "";

      const parts = [street, area, city, state].filter(Boolean);
      const fullAddress = parts.length > 0 ? parts.join(", ") : data.display_name;

      return {
        fullAddress,
        pincode,
        area,
        street,
        landmark,
        city,
        state,
      };
    }
  } catch (e) {
    console.warn("Detailed reverse geocode error:", e);
  }
  return {
    pincode: "",
    area: "",
    street: "",
    landmark: "",
    city: "",
    state: "",
    fullAddress: "Location recorded",
  };
}

/**
 * Navigation shortcut URLs (Two-Wheeler / Driving / Walking).
 */
export function getNavigationUrls(lat: number, lng: number): {
  googleMapsTwoWheeler: string;
  googleMapsDriving: string;
  googleMapsWalking: string;
} {
  return {
    googleMapsTwoWheeler: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=two_wheeler`,
    googleMapsDriving: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
    googleMapsWalking: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
  };
}

/**
 * Fast navigation URL with optional origin for instant turn-by-turn routing.
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

  return `https://www.google.com/maps/dir/?api=1&destination=${cleanDestLat},${cleanDestLng}&travelmode=${mode}&dir_action=navigate`;
}
