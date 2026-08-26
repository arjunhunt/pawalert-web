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
 * Synthesizes a loud, piercing, high-volume emergency rescue alarm using Web Audio API + Dynamic Compressor
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

    // Master Dynamic Range Compressor for maximum perceived volume on phone speakers
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, now);
    compressor.knee.setValueAtTime(40, now);
    compressor.ratio.setValueAtTime(14, now);
    compressor.attack.setValueAtTime(0.002, now);
    compressor.release.setValueAtTime(0.15, now);

    // Master Boost Gain Node
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.4, now);

    masterGain.connect(compressor);
    compressor.connect(ctx.destination);

    // Helper to play an urgent, piercing emergency pulse
    const playUrgentPulse = (startFreq: number, endFreq: number, startTime: number, duration: number) => {
      // 1. Sawtooth wave (maximum brightness and acoustic cut-through)
      const oscSaw = ctx.createOscillator();
      const gainSaw = ctx.createGain();
      oscSaw.type = "sawtooth";
      oscSaw.frequency.setValueAtTime(startFreq, startTime);
      oscSaw.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

      gainSaw.gain.setValueAtTime(0.65, startTime);
      gainSaw.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscSaw.connect(gainSaw);
      gainSaw.connect(masterGain);

      oscSaw.start(startTime);
      oscSaw.stop(startTime + duration);

      // 2. Square wave (punchy attack bite)
      const oscSq = ctx.createOscillator();
      const gainSq = ctx.createGain();
      oscSq.type = "square";
      oscSq.frequency.setValueAtTime(startFreq * 1.5, startTime);
      oscSq.frequency.exponentialRampToValueAtTime(endFreq * 1.5, startTime + duration);

      gainSq.gain.setValueAtTime(0.4, startTime);
      gainSq.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscSq.connect(gainSq);
      gainSq.connect(masterGain);

      oscSq.start(startTime);
      oscSq.stop(startTime + duration);
    };

    // 🚨 Urgent 4-Pulse Emergency Ambulance / Rescue Siren Pattern (1.1s total)
    // Double-pulse 1 (High attention)
    playUrgentPulse(880, 1400, now, 0.16);
    playUrgentPulse(987, 1600, now + 0.18, 0.16);

    // Double-pulse 2 (High climax)
    playUrgentPulse(1046, 1760, now + 0.45, 0.18);
    playUrgentPulse(1318, 2093, now + 0.68, 0.3);
  } catch (e) {
    console.warn("Audio alarm error:", e);
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
