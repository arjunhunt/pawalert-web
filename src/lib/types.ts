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

export type PawMedicSeverity = "CRITICAL" | "MODERATE" | "MINOR" | "HEALTHY_OR_HUNGRY";

export interface PawMedicResult {
  severity: PawMedicSeverity;
  conditionTitle: string;
  confidence: string;
  summary: string;
  firstAidSteps: string[];
  safetyPrecautions: string;
  equipmentNeeded: string[];
  suggestedTags: string[];
}

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
  pawmedic_diagnosis?: PawMedicResult | null;
  created_at: string;
  updated_at: string;
}

export type CommentType = "UPDATE" | "ON_MY_WAY" | "FEEDING" | "VET_CONTACTED" | "GENERAL";

export interface ReportComment {
  id: string;
  report_id: string;
  author_id: string;
  author_name: string;
  content: string;
  comment_type: CommentType;
  created_at: string;
}

export const COMMENT_TYPE_TAGS: Record<CommentType, { label: string; icon: string; bg: string }> = {
  ON_MY_WAY: { label: "On my way", icon: "🏃‍♂️", bg: "bg-blue-950/40 text-blue-400 border-blue-800/40" },
  FEEDING: { label: "Bringing food", icon: "🍲", bg: "bg-amber-950/40 text-amber-400 border-amber-800/40" },
  VET_CONTACTED: { label: "Contacted Vet", icon: "🩺", bg: "bg-red-950/40 text-red-400 border-red-800/40" },
  UPDATE: { label: "Location/Spot update", icon: "📍", bg: "bg-purple-950/40 text-purple-400 border-purple-800/40" },
  GENERAL: { label: "General Update", icon: "💬", bg: "bg-neutral-800/60 text-neutral-300 border-neutral-700/60" },
};

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
