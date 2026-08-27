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
 * Synthesizes a warm, pleasant, and crystal-clear notification chime using Web Audio API
 * (Melodic 3-note ascending crystal bell with gentle decay - pleasant and noticeable without being harsh)
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

    // Helper to play a warm, crystal bell note
    const playBellNote = (freq: number, startTime: number, duration: number = 0.6, volume: number = 0.45) => {
      // 1. Primary fundamental tone (Smooth Sine)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      // Smooth attack & exponential bell decay
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);

      // 2. Crystal overtone harmonic (2x frequency at softer volume for sparkle)
      const oscHarmonic = ctx.createOscillator();
      const gainHarmonic = ctx.createGain();
      oscHarmonic.type = "sine";
      oscHarmonic.frequency.setValueAtTime(freq * 2, startTime);

      gainHarmonic.gain.setValueAtTime(0.001, startTime);
      gainHarmonic.gain.linearRampToValueAtTime(volume * 0.25, startTime + 0.01);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

      oscHarmonic.connect(gainHarmonic);
      gainHarmonic.connect(ctx.destination);

      oscHarmonic.start(startTime);
      oscHarmonic.stop(startTime + duration);
    };

    // 🎵 Melodic Dual-Phrase Crystal Bell Sequence (~2.5s total duration)
    // Phrase 1 (Ascending Chime)
    playBellNote(880.0, now, 0.55, 0.45);          // A5
    playBellNote(1108.73, now + 0.2, 0.55, 0.48);  // C#6
    playBellNote(1318.51, now + 0.4, 0.7, 0.52);   // E6

    // Phrase 2 (Uplifting Response & Sparkling Sustain)
    playBellNote(880.0, now + 0.85, 0.5, 0.4);     // A5
    playBellNote(1318.51, now + 1.05, 0.6, 0.48);  // E6
    playBellNote(1760.0, now + 1.25, 1.2, 0.55);   // A6 (High sparkling crystal resolve with long warm resonance)
  } catch (e) {
    console.warn("Audio chime error:", e);
  }
}

/**
 * Triggers punchy phone vibration if supported
 */
export function vibrateDevice(pattern: number[] = [200, 100, 200, 250, 200, 100, 400]): void {
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
