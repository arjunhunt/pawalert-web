"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Sparkles,
  ArrowLeft,
  Upload,
  Camera,
  Loader2,
  AlertCircle,
  RefreshCw,
  Dog,
  ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PhotoUpload from "@/components/PhotoUpload";
import PawMedicTriageCard from "@/components/PawMedicTriageCard";
import { PawMedicResult } from "@/lib/types";

export default function PawMedicPage() {
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [userNotes, setUserNotes] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [diagnosis, setDiagnosis] = useState<PawMedicResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePhotoReady = async (url: string) => {
    setPhotoUrl(url);
    await triggerScan(url, userNotes);
  };

  const triggerScan = async (urlToScan?: string, notes?: string) => {
    const targetUrl = urlToScan || photoUrl;
    if (!targetUrl) {
      setErrorMsg("Please upload or snap a photo of the dog first.");
      return;
    }

    setIsScanning(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/pawmedic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl: targetUrl.startsWith("data:") ? undefined : targetUrl,
          imageBase64: targetUrl.startsWith("data:") ? targetUrl : undefined,
          userNotes: notes || userNotes,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setDiagnosis(json.data);
      } else {
        throw new Error(json.error || "Failed to analyze image");
      }
    } catch (e: any) {
      console.error("PawMedic scan error:", e);
      setErrorMsg("Could not complete AI scan. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  // Preset sample diagnostic test cases
  const loadSampleCase = async (sampleType: "FRACTURE" | "MANGE" | "HUNGRY") => {
    setIsScanning(true);
    setErrorMsg(null);
    setPhotoUrl("");

    let sampleNotes = "";
    if (sampleType === "FRACTURE") sampleNotes = "Dog hit by a speeding vehicle, bleeding from left paw and unable to stand";
    if (sampleType === "MANGE") sampleNotes = "Stray dog with severe skin hair loss, scratching open sores, and redness";
    if (sampleType === "HUNGRY") sampleNotes = "Mother dog with 4 newborn hungry puppies under a tea stall";

    setUserNotes(sampleNotes);

    try {
      const res = await fetch("/api/pawmedic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemType: sampleType === "FRACTURE" ? "INJURED" : sampleType === "MANGE" ? "SICK" : "HUNGRY",
          userNotes: sampleNotes,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setDiagnosis(json.data);
      }
    } catch (e) {
      console.error("Sample scan error", e);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg text-neutral-100 flex flex-col font-sans pb-16">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Live Map</span>
          </Link>

          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-full flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-cyan-300" />
            <span>Gemini Vision 2.0</span>
          </span>
        </div>

        {/* Hero Banner */}
        <div className="text-center space-y-2 relative overflow-hidden p-6 rounded-3xl bg-gradient-to-b from-cyan-950/40 via-darkCard to-darkCard border border-cyan-800/30">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-500/20">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            PawMedic AI™ Triage
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto leading-relaxed">
            Real-time multimodal veterinary computer vision triage. Upload or snap a dog photo for instant wound severity assessment and emergency first-aid protocols.
          </p>
        </div>

        {/* Sample Clinical Cases */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-darkBorder space-y-2">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-pawAmber" />
            <span>Sample Clinical Cases:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => loadSampleCase("FRACTURE")}
              className="py-2 px-2.5 rounded-xl bg-red-950/30 hover:bg-red-950/60 border border-red-800/40 text-red-300 text-xs font-bold transition-all text-center"
            >
              🚨 Hit & Run Trauma
            </button>
            <button
              type="button"
              onClick={() => loadSampleCase("MANGE")}
              className="py-2 px-2.5 rounded-xl bg-amber-950/30 hover:bg-amber-950/60 border border-amber-800/40 text-amber-300 text-xs font-bold transition-all text-center"
            >
              🩹 Skin Infection / Mange
            </button>
            <button
              type="button"
              onClick={() => loadSampleCase("HUNGRY")}
              className="py-2 px-2.5 rounded-xl bg-green-950/30 hover:bg-green-950/60 border border-green-800/40 text-green-300 text-xs font-bold transition-all text-center"
            >
              🍼 Hungry Litter
            </button>
          </div>
        </div>

        {/* Photo Upload Scanner Box */}
        <div className="space-y-4 bg-darkCard border border-darkBorder rounded-3xl p-5 sm:p-6 shadow-xl">
          <h3 className="text-xs font-bold text-pawAmber uppercase tracking-wider flex items-center space-x-1.5">
            <Camera className="w-4 h-4" />
            <span>Upload or Take Photo of Dog:</span>
          </h3>

          <PhotoUpload
            onPhotoReady={handlePhotoReady}
            currentPhotoUrl={photoUrl}
          />

          {/* Optional Notes */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-neutral-400">
              Additional Observations (Optional):
            </label>
            <input
              type="text"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="e.g. Limping on right leg, crying when touched..."
              className="w-full bg-darkBg border border-darkBorder rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Trigger Scan Button */}
          {photoUrl && (
            <button
              type="button"
              onClick={() => triggerScan()}
              disabled={isScanning}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/20 transition-all active:scale-98 disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                  <span>PawMedic AI Analyzing Wound & Vitals...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  <span>Run PawMedic AI Diagnostic Scan</span>
                </>
              )}
            </button>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Live Loading Radar Animation */}
        {isScanning && (
          <div className="p-8 rounded-3xl bg-darkCard border border-cyan-500/40 text-center space-y-3 animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="text-sm font-bold text-white">
              Multimodal Vision Scanning in Progress...
            </div>
            <p className="text-xs text-cyan-300">
              Evaluating anatomical trauma, wound depth, and emergency urgency
            </p>
          </div>
        )}

        {/* Diagnosis Output Card */}
        {diagnosis && !isScanning && (
          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <PawMedicTriageCard diagnosis={diagnosis} />

            {/* Direct Link to Report Dog */}
            <div className="text-center pt-2">
              <Link
                href="/report"
                className="inline-flex items-center space-x-2 py-3 px-6 rounded-2xl bg-pawAmber hover:bg-pawAmber-hover text-white font-bold text-xs sm:text-sm shadow-lg shadow-pawAmber/20 transition-all active:scale-95"
              >
                <Dog className="w-4 h-4" />
                <span>Broadcast as Live Emergency Distress Alert</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
