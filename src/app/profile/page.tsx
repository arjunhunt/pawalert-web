"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, ShieldCheck, Heart, Award, Database, CheckCircle2, Sparkles, Dog } from "lucide-react";
import Navbar from "@/components/Navbar";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const [name, setName] = useState<string>("Arjun (Dog Volunteer)");
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-darkBg">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-neutral-400 hover:text-white text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Feed</span>
        </Link>

        {/* Profile Card */}
        <div className="bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* Avatar & Header */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-pawAmber/20 border border-pawAmber/30 flex items-center justify-center text-pawAmber">
              <Dog className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">{name}</h1>
              <p className="text-xs text-pawAmber font-semibold flex items-center space-x-1 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span>Verified Community Feeder</span>
              </p>
            </div>
          </div>

          {/* Volunteer Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-darkBg border border-darkBorder rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-pawAmber">12</div>
              <div className="text-[11px] text-neutral-400 font-semibold mt-1">Dogs Fed</div>
            </div>
            <div className="bg-darkBg border border-darkBorder rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-green-400">4</div>
              <div className="text-[11px] text-neutral-400 font-semibold mt-1">Rescues</div>
            </div>
            <div className="bg-darkBg border border-darkBorder rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-amber-400">380</div>
              <div className="text-[11px] text-neutral-400 font-semibold mt-1">Karma Pts</div>
            </div>
          </div>

          {/* Volunteer Badges */}
          <div className="space-y-3 pt-2 border-t border-darkBorder">
            <h3 className="text-xs font-bold text-pawAmber uppercase tracking-wider flex items-center space-x-1.5">
              <Award className="w-4 h-4" />
              <span>Community Badges</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-darkBg border border-darkBorder flex items-center space-x-3">
                <div className="text-2xl">🥇</div>
                <div>
                  <div className="font-bold text-white">First Responder</div>
                  <div className="text-neutral-400 text-[11px]">Handled 5+ critical alerts</div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-darkBg border border-darkBorder flex items-center space-x-3">
                <div className="text-2xl">🐾</div>
                <div>
                  <div className="font-bold text-white">Pack Guardian</div>
                  <div className="text-neutral-400 text-[11px]">Daily feeding in Umargam</div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile Form */}
          <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-darkBorder">
            <h3 className="text-xs font-bold text-pawAmber uppercase tracking-wider">
              Feeder Handle & Settings
            </h3>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                Display Name / Handle
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-darkBg border border-darkBorder rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs font-bold transition-all flex items-center space-x-2"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </form>

          {/* Supabase Connection Post-Deploy Status */}
          <div className="pt-2 border-t border-darkBorder space-y-2">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Database className="w-4 h-4" />
              <span>Backend Cloud Status</span>
            </h3>

            <div className={`p-4 rounded-2xl border text-xs ${
              isSupabaseConfigured
                ? "bg-green-950/20 border-green-800/40 text-green-300"
                : "bg-darkBg border-darkBorder text-neutral-300"
            }`}>
              <div className="font-bold mb-1 flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? "bg-green-400 animate-ping" : "bg-pawAmber"}`} />
                <span>{isSupabaseConfigured ? "Connected to Supabase Cloud" : "Demo Mode (Local Data)"}</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {isSupabaseConfigured
                  ? "Live WebSocket alerts, PostgreSQL, and Storage are active."
                  : "To connect your Supabase database, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel."}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
