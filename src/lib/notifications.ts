/**
 * PawAlert Proximity Notification & Audio Alert Engine
 * Dispatches instant browser push notifications, Web Audio chimes, and vibrations
 * for distress reports within the volunteer's radius.
 */

import { DogReport, PROBLEM_TYPE_LABELS } from "./types";
import { formatDistance } from "./geo";

export const DEFAULT_RADIUS_KM = 10;

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem("pawalert_notifications_enabled", permission === "granted" ? "true" : "false");
    return permission;
  } catch (e) {
    console.warn("Could not request notification permission", e);
    return "denied";
  }
}

export function isNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("pawalert_notifications_enabled");
  return saved === "true" && getNotificationPermission() === "granted";
}

export function getAlertRadiusKm(): number {
  if (typeof window === "undefined") return DEFAULT_RADIUS_KM;
  const saved = localStorage.getItem("pawalert_alert_radius_km");
  return saved ? parseInt(saved, 10) : DEFAULT_RADIUS_KM;
}

export function setAlertRadiusKm(km: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("pawalert_alert_radius_km", km.toString());
}

/**
 * Synthesizes an attention-grabbing emergency chime using Web Audio API
 */
export function playEmergencyChime(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First harmonic tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second harmonic tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.4); // D6

    gain2.gain.setValueAtTime(0.3, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.2);
    osc2.stop(now + 0.55);
  } catch (e) {
    console.warn("Audio chime error:", e);
  }
}

/**
 * Triggers phone vibration if supported
 */
export function vibrateDevice(pattern: number[] = [200, 100, 200]): void {
  if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration errors
    }
  }
}

/**
 * Fires proximity alert (Push Notification + Sound + Vibration)
 */
export function sendProximityAlert(
  report: DogReport,
  distanceMeters: number | null
): void {
  const catInfo = PROBLEM_TYPE_LABELS[report.problem_type] || PROBLEM_TYPE_LABELS.OTHER;
  const distStr = distanceMeters !== null ? `(${formatDistance(distanceMeters)} away)` : "";
  const title = `🚨 URGENT: ${catInfo.label} Dog Reported ${distStr}`;
  const body = `${report.description}\n📍 Location: ${report.landmark || report.address || "Coordinates pinned"}`;

  // 1. Play sound chime
  playEmergencyChime();

  // 2. Vibrate phone
  vibrateDevice([250, 100, 250, 100, 350]);

  // 3. System Push Notification
  if (isNotificationSupported() && Notification.permission === "granted") {
    try {
      const notif = new Notification(title, {
        body: body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `pawalert-${report.id}`,
      });

      notif.onclick = () => {
        window.focus();
        window.location.href = `/alert/${report.id}`;
      };
    } catch (e) {
      console.warn("Push notification error", e);
    }
  }
}
