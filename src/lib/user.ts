import { DogReport } from "./types";

export function getUserId(): string {
  if (typeof window === "undefined") return "anonymous";
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

  const currentUserId = getUserId();
  if (report.reporter_id && report.reporter_id === currentUserId) return true;

  try {
    const list = JSON.parse(localStorage.getItem("pawalert_my_report_ids") || "[]");
    if (list.includes(report.id)) return true;
  } catch (e) {
    // Ignore JSON parse errors
  }

  return false;
}
