import { DogReport } from "./types";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export const ADMIN_SECRET_PASSCODE = "shipra@3007";

export interface UserProfile {
  id: string;
  email?: string | null;
  display_name: string;
  dogs_fed: number;
  rescues: number;
  reports_made: number;
  is_authenticated: boolean;
}

export function getUserId(): string {
  if (typeof window === "undefined") return "anonymous";
  // Check if authenticated user ID is stored
  const authId = localStorage.getItem("pawalert_auth_user_id");
  if (authId) return authId;

  let userId = localStorage.getItem("pawalert_user_id");
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("pawalert_user_id", userId);
  }
  return userId;
}

export function getUserName(): string {
  if (typeof window === "undefined") return "Community Feeder";
  let name = localStorage.getItem("pawalert_user_name");
  if (!name) {
    name = `Feeder #${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem("pawalert_user_name", name);
  }
  return name;
}

export function addMyReportId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const list = JSON.parse(localStorage.getItem("pawalert_my_report_ids") || "[]");
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem("pawalert_my_report_ids", JSON.stringify(list));
    }
  } catch (e) {
    localStorage.setItem("pawalert_my_report_ids", JSON.stringify([id]));
  }
}

export function removeMyReportId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const list = JSON.parse(localStorage.getItem("pawalert_my_report_ids") || "[]");
    const updated = list.filter((item: string) => item !== id);
    localStorage.setItem("pawalert_my_report_ids", JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
}

export function isMyReport(report: DogReport | null): boolean {
  if (!report) return false;
  if (typeof window === "undefined") return false;

  // 1. Super Admin has master ownership/take-down privileges on all reports
  if (isAdmin()) return true;

  const currentUserId = getUserId();

  // 2. Direct unique ID match (created by this device/account)
  if (
    report.reporter_id &&
    currentUserId &&
    currentUserId !== "anonymous" &&
    report.reporter_id === currentUserId
  ) {
    return true;
  }

  // 3. Saved created list match on this specific device
  try {
    const list = JSON.parse(localStorage.getItem("pawalert_my_report_ids") || "[]");
    if (Array.isArray(list) && list.includes(report.id)) {
      return true;
    }
  } catch (e) {
    // Ignore parse errors
  }

  return false;
}

/**
 * Super Admin & Founder Privileges
 */
export const SUPER_ADMIN_EMAILS = [
  "wishhhhmaster@gmail.com",
];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    SUPER_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean) ||
    clean.includes("wishhhhmaster")
  );
}

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("pawalert_is_admin") === "true") return true;

  const authEmail = localStorage.getItem("pawalert_auth_email");
  if (authEmail && isSuperAdminEmail(authEmail)) return true;

  return false;
}

export function unlockAdmin(passcode: string): boolean {
  if (typeof window === "undefined") return false;
  if (passcode.trim() === ADMIN_SECRET_PASSCODE) {
    localStorage.setItem("pawalert_is_admin", "true");
    return true;
  }
  return false;
}

export function lockAdmin(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("pawalert_is_admin");
}

/**
 * Syncs stats with Supabase Cloud profile if user is logged in
 */
export async function syncStatsToCloud(
  action: "DOG_FED" | "RESCUE" | "REPORT_MADE",
  currentFed: number,
  currentRescues: number,
  currentReports: number
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let updatedFed = currentFed;
    let updatedRescues = currentRescues;
    let updatedReports = currentReports;

    if (action === "DOG_FED") updatedFed += 1;
    if (action === "RESCUE") updatedRescues += 1;
    if (action === "REPORT_MADE") updatedReports += 1;

    await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        display_name: getUserName(),
        dogs_fed: updatedFed,
        rescues: updatedRescues,
        reports_made: updatedReports,
        updated_at: new Date().toISOString(),
      });
  } catch (e) {
    console.warn("Could not sync to cloud profile", e);
  }
}
