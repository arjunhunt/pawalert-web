/**
 * PawAlert Enterprise Security Utilities
 * Protects against XSS, script injection, bot flooding, scam links, and invalid payloads.
 */

export function isSafeImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();

  // 1. Allow secure Supabase or remote HTTPS/HTTP image URLs
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return true;
  }

  // 2. Allow valid Base64 image data URIs (JPEG, PNG, WebP only)
  const base64Regex = /^data:image\/(jpeg|png|webp|jpg);base64,[A-Za-z0-9+/=]+$/;
  if (trimmed.startsWith("data:image/") && base64Regex.test(trimmed)) {
    return true;
  }

  // Reject all other schemes (javascript:, data:text/html, etc.)
  return false;
}

export function sanitizeText(text: string, maxLength: number = 1000): string {
  if (!text || typeof text !== "string") return "";
  // Strip control characters while keeping standard whitespace
  const sanitized = text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .trim();
  return sanitized.slice(0, maxLength);
}

export function validateCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

export function checkRateLimit(
  actionKey: string,
  cooldownMs: number
): { allowed: boolean; remainingSec: number } {
  if (typeof window === "undefined") return { allowed: true, remainingSec: 0 };

  const storageKey = `pawalert_ratelimit_${actionKey}`;
  const lastTime = parseInt(localStorage.getItem(storageKey) || "0", 10);
  const now = Date.now();
  const diff = now - lastTime;

  if (diff < cooldownMs) {
    const remainingSec = Math.ceil((cooldownMs - diff) / 1000);
    return { allowed: false, remainingSec };
  }

  localStorage.setItem(storageKey, now.toString());
  return { allowed: true, remainingSec: 0 };
}

// Anti-Phishing & Spam Link Detector
export function containsSuspiciousLinks(text: string): boolean {
  if (!text) return false;
  const suspiciousPattern = /(bit\.ly|tinyurl\.com|t\.me\/|free-crypto|earn-money|casin|poker|whatsapp\.com\/channel)/i;
  return suspiciousPattern.test(text);
}
