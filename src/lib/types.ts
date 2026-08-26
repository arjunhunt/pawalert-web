export type ProblemType =
  | "HUNGRY"
  | "INJURED"
  | "SICK"
  | "STUCK"
  | "AGGRESSIVE"
  | "LOST"
  | "NEWBORN_LITTER"
  | "OTHER";

export type ReportStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface DogReport {
  id: string;
  reporter_id: string;
  reporter_name: string;
  problem_type: ProblemType;
  description: string;
  photo_url: string;
  latitude: number;
  longitude: number;
  address: string;
  landmark: string;
  status: ReportStatus;
  helper_id?: string | null;
  helper_name?: string | null;
  created_at: string;
  updated_at: string;
}

export const PROBLEM_TYPE_LABELS: Record<ProblemType, { label: string; icon: string; color: string }> = {
  HUNGRY: { label: "Hungry / Needs Food", icon: "🍖", color: "#EF6C00" },
  INJURED: { label: "Injured", icon: "🩹", color: "#E53935" },
  SICK: { label: "Sick / Weak", icon: "💊", color: "#8E24AA" },
  STUCK: { label: "Stuck / Trapped", icon: "⚠️", color: "#F57C00" },
  AGGRESSIVE: { label: "Aggressive Behavior", icon: "🚨", color: "#C62828" },
  LOST: { label: "Lost Dog", icon: "🔍", color: "#1976D2" },
  NEWBORN_LITTER: { label: "Newborn Puppies", icon: "🍼", color: "#D81B60" },
  OTHER: { label: "Other Problem", icon: "🐾", color: "#795548" },
};

export const STATUS_LABELS: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  OPEN: { label: "Needs Help", color: "#E53935", bg: "bg-red-950/40 text-red-400 border-red-800/50" },
  IN_PROGRESS: { label: "Being Handled", color: "#FFB300", bg: "bg-amber-950/40 text-amber-400 border-amber-800/50" },
  RESOLVED: { label: "Resolved", color: "#43A047", bg: "bg-green-950/40 text-green-400 border-green-800/50" },
};
