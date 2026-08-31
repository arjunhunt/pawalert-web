"use client";

import { useState } from "react";
import {
  PawMedicResult,
  PawMedicSeverity,
} from "@/lib/types";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Package,
  Wand2,
} from "lucide-react";

interface PawMedicTriageCardProps {
  diagnosis: PawMedicResult;
  onApplyToReport?: (summary: string, severity: PawMedicSeverity) => void;
  isApplied?: boolean;
  compact?: boolean;
}

export default function PawMedicTriageCard({
  diagnosis,
  onApplyToReport,
  isApplied,
  compact = false,
}: PawMedicTriageCardProps) {
  const [expanded, setExpanded] = useState<boolean>(!compact);

  const getSeverityBadge = (sev: PawMedicSeverity) => {
    switch (sev) {
      case "CRITICAL":
        return {
          label: "🔴 CRITICAL EMERGENCY",
          sublabel: "Immediate 24/7 Vet Care Required",
          border: "border-red-500/80 shadow-red-950/40",
          bg: "from-red-950/50 via-neutral-900 to-red-950/30",
          badgeBg: "bg-red-500/20 border-red-500/40 text-red-300",
          text: "text-red-400",
        };
      case "MODERATE":
        return {
          label: "🟡 MODERATE INJURY",
          sublabel: "Requires On-Ground First-Aid & Medication",
          border: "border-amber-500/70 shadow-amber-950/40",
          bg: "from-amber-950/40 via-neutral-900 to-amber-950/20",
          badgeBg: "bg-amber-500/20 border-amber-500/40 text-amber-300",
          text: "text-amber-400",
        };
      case "MINOR":
      case "HEALTHY_OR_HUNGRY":
      default:
        return {
          label: "🟢 MINOR / NUTRITIONAL CARE",
          sublabel: "Nutrition & Safe Shelter Required",
          border: "border-green-500/60 shadow-green-950/30",
          bg: "from-green-950/40 via-neutral-900 to-emerald-950/20",
          badgeBg: "bg-green-500/20 border-green-500/40 text-green-300",
          text: "text-green-400",
        };
    }
  };

  const badgeStyle = getSeverityBadge(diagnosis.severity);

  return (
    <div
      className={`rounded-3xl border-2 bg-gradient-to-br ${badgeStyle.bg} ${badgeStyle.border} p-4 sm:p-5 shadow-xl transition-all relative overflow-hidden space-y-4`}
    >
      {/* Background Tech Ambient Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-darkBorder/60 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 animate-pulse">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-black tracking-wide text-white">PawMedic AI™</span>
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[9px] font-bold text-cyan-300 flex items-center space-x-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Multimodal Vision</span>
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">Instant Veterinary Injury Triage</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeStyle.badgeBg}`}>
            {badgeStyle.label}
          </span>
          {compact && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Diagnosis Overview */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <h4 className="text-sm sm:text-base font-extrabold text-white">
            {diagnosis.conditionTitle}
          </h4>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded-md">
            Accuracy: {diagnosis.confidence}
          </span>
        </div>
        <p className="text-xs text-neutral-300 leading-relaxed">
          {diagnosis.summary}
        </p>
      </div>

      {expanded && (
        <>
          {/* First Aid Checklist */}
          <div className="space-y-2 pt-1">
            <h5 className="text-xs font-bold text-pawAmber uppercase tracking-wider flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>Step-by-Step Emergency First Aid:</span>
            </h5>
            <div className="space-y-1.5">
              {diagnosis.firstAidSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-darkBg/80 border border-darkBorder flex items-start space-x-2.5 text-xs text-neutral-200"
                >
                  <span className="w-4 h-4 rounded-full bg-pawAmber/20 border border-pawAmber/40 text-pawAmber text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-snug">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety & Equipment Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            {/* Volunteer Safety */}
            <div className="p-3 rounded-xl bg-red-950/20 border border-red-800/30 text-neutral-300 space-y-1">
              <div className="text-[11px] font-bold text-red-400 flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Volunteer Safety Guideline</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-tight">
                {diagnosis.safetyPrecautions}
              </p>
            </div>

            {/* Recommended Kit */}
            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-neutral-300 space-y-1">
              <div className="text-[11px] font-bold text-cyan-400 flex items-center space-x-1">
                <Package className="w-3.5 h-3.5 shrink-0" />
                <span>Recommended Supplies</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {diagnosis.equipmentNeeded.map((item, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] bg-cyan-900/30 border border-cyan-700/40 text-cyan-200 px-1.5 py-0.5 rounded-md"
                  >
                    • {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 1-Tap Action to Auto-Fill Report Description */}
      {onApplyToReport && (
        <button
          type="button"
          onClick={() =>
            onApplyToReport(
              `[PawMedic AI Triage: ${diagnosis.conditionTitle} (${badgeStyle.label})]\n${diagnosis.summary}\n\nImmediate First Aid:\n${diagnosis.firstAidSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
              diagnosis.severity
            )
          }
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
            isApplied
              ? "bg-green-600/30 border border-green-500 text-green-300"
              : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/20 active:scale-98"
          }`}
        >
          {isApplied ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>AI Triage Applied to Report!</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>⚡ Auto-Apply AI Triage to Report Description</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
