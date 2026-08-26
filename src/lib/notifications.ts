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
 * Synthesizes an attention-grabbing, loud, and crisp emergency distress alarm chime using Web Audio API
 */
export function playEmergencyChime(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // Helper to play a crisp, loud harmonic tone pulse
    const playTone = (freq1: number, freq2: number, startTime: number, duration: number, vol: number = 0.8) => {
      // Primary clear tone (triangle for crisp punchiness)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq1, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq2, startTime + duration);

      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);

      // Warm harmonic sine backing
      const oscSub = ctx.createOscillator();
      const gainSub = ctx.createGain();
      oscSub.type = "sine";
      oscSub.frequency.setValueAtTime(freq1 * 0.5, startTime);

      gainSub.gain.setValueAtTime(vol * 0.4, startTime);
      gainSub.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscSub.connect(gainSub);
      gainSub.connect(ctx.destination);

      oscSub.start(startTime);
      oscSub.stop(startTime + duration);
    };

    // 🚨 3-Pulse Urgent Distress Alert Sequence: Beep - Beep - BEEP!
    playTone(659.25, 880.0, now, 0.18, 0.75);         // E5 -> A5
    playTone(783.99, 1046.5, now + 0.22, 0.18, 0.8);   // G5 -> C6
    playTone(1046.5, 1318.5, now + 0.44, 0.28, 0.9);   // C6 -> E6 (High alert climax)
  } catch (e) {
    console.warn("Audio chime error:", e);
  }
}

/**
 * Triggers punchy phone vibration if supported
 */
export function vibrateDevice(pattern: number[] = [300, 100, 300, 100, 500]): void {
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
