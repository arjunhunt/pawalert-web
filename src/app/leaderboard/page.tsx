"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Crown,
  Medal,
  Award,
  ArrowLeft,
  Sparkles,
  Dog,
  Share2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AchievementCardModal from "@/components/AchievementCardModal";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { getUserName, getUserId } from "@/lib/user";

interface LeaderboardUser {
  id: string;
  name: string;
  dogs_fed: number;
  rescues: number;
  reports_made: number;
  karma: number;
  badge: string;
}

const DEFAULT_DEMO_LEADERBOARD: LeaderboardUser[] = [
  {
    id: "demo-1",
    name: "Arjun (Dog Guardian)",
    dogs_fed: 18,
    rescues: 6,
    reports_made: 4,
    karma: 18 * 30 + 6 * 100 + 4 * 50, // 540 + 600 + 200 = 1340
    badge: "Champion Feeder 🥇",
  },
  {
    id: "demo-2",
    name: "Priya (Pack Feeder)",
    dogs_fed: 14,
    rescues: 3,
    reports_made: 2,
    karma: 14 * 30 + 3 * 100 + 2 * 50, // 420 + 300 + 100 = 820
    badge: "Silver Guardian 🥈",
  },
  {
    id: "demo-3",
    name: "Vikram (Life Saver)",
    dogs_fed: 8,
    rescues: 4,
    reports_made: 1,
    karma: 8 * 30 + 4 * 100 + 1 * 50, // 240 + 400 + 50 = 690
    badge: "Bronze Rescuer 🥉",
  },
  {
    id: "demo-4",
    name: "Rahul (Animal Care)",
    dogs_fed: 9,
    rescues: 1,
    reports_made: 2,
    karma: 9 * 30 + 1 * 100 + 2 * 50, // 270 + 100 + 100 = 470
    badge: "Pack Feeder 🌱",
  },
  {
    id: "demo-5",
    name: "Sneha (Street Buddy)",
    dogs_fed: 6,
    rescues: 1,
    reports_made: 1,
    karma: 6 * 30 + 1 * 100 + 1 * 50, // 180 + 100 + 50 = 330
    badge: "Community Member 🌱",
  },
];

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>(DEFAULT_DEMO_LEADERBOARD);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedUserForCard, setSelectedUserForCard] = useState<LeaderboardUser | null>(null);

  const currentUserName = getUserName();
  const currentUserId = getUserId();

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("rescues", { ascending: false });

        if (!error && data && data.length > 0) {
          const formatted: LeaderboardUser[] = data.map((p: any) => {
            const fed = p.dogs_fed || 0;
            const res = p.rescues || 0;
            const rep = p.reports_made || 0;
            const karma = fed * 30 + res * 100 + rep * 50;

            let badge = "Community Member 🌱";
            if (karma >= 1000) badge = "Champion Feeder 🥇";
            else if (res >= 3) badge = "Life Saver 🚑";
            else if (fed >= 5) badge = "Pack Feeder 🍖";

            return {
              id: p.id,
              name: p.display_name || "Community Feeder",
              dogs_fed: fed,
              rescues: res,
              reports_made: rep,
              karma: karma,
              badge: badge,
            };
          });

          // Sort descending by Karma
          formatted.sort((a, b) => b.karma - a.karma);

          // If current local user is not yet in Supabase profiles, include them
          const savedFed = parseInt(localStorage.getItem("pawalert_dogs_fed") || "0", 10);
          const savedRes = parseInt(localStorage.getItem("pawalert_rescues") || "0", 10);
          const savedRep = parseInt(localStorage.getItem("pawalert_reports_made") || "0", 10);
          const userKarma = savedFed * 30 + savedRes * 100 + savedRep * 50;

          const exists = formatted.some((u) => u.name.toLowerCase() === currentUserName.toLowerCase());
          if (!exists && (userKarma > 0 || currentUserName)) {
            formatted.push({
              id: currentUserId,
              name: currentUserName,
              dogs_fed: savedFed,
              rescues: savedRes,
              reports_made: savedRep,
              karma: userKarma,
              badge: userKarma >= 500 ? "Life Saver 🚑" : "Community Member 🌱",
            });
            formatted.sort((a, b) => b.karma - a.karma);
          }

          setLeaders(formatted);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not load cloud leaderboard, using default list", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const top1 = leaders[0];
  const top2 = leaders[1];
  const top3 = leaders[2];

  // Current user's local stats for quick card sharing
  const userFed = parseInt(typeof window !== "undefined" ? localStorage.getItem("pawalert_dogs_fed") || "0" : "0", 10);
  const userRescues = parseInt(typeof window !== "undefined" ? localStorage.getItem("pawalert_rescues") || "0" : "0", 10);
  const userReports = parseInt(typeof window !== "undefined" ? localStorage.getItem("pawalert_reports_made") || "0" : "0", 10);
  const userKarma = userFed * 30 + userRescues * 100 + userReports * 50;

  return (
    <div className="min-h-screen flex flex-col bg-darkBg">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-neutral-400 hover:text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Live Feed</span>
          </Link>

          <div className="flex items-center space-x-2">
            <button
              onClick={() =>
                setSelectedUserForCard({
                  id: currentUserId,
                  name: currentUserName,
                  dogs_fed: userFed,
                  rescues: userRescues,
                  reports_made: userReports,
                  karma: userKarma,
                  badge: "Community Guardian",
                })
              }
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs font-bold shadow-md shadow-pawAmber/20 transition-all active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share My Impact Card</span>
            </button>

            <button
              onClick={fetchLeaderboard}
              disabled={isLoading}
              className="p-2 rounded-xl bg-darkCard hover:bg-neutral-800 border border-darkBorder text-neutral-400 hover:text-white"
              title="Refresh Leaderboard"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-pawAmber" : ""}`} />
            </button>
          </div>
        </div>

        {/* Title Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-pawAmber/40 flex items-center justify-center text-pawAmber mx-auto shadow-xl shadow-pawAmber/10">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Community Feeder Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
            Honoring local heroes who feed hungry stray dogs and rescue injured animals across our city.
          </p>
        </div>

        {/* 🏆 Top 3 Golden Podium */}
        {leaders.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4 pb-2">
            {/* #2 Silver Hero */}
            {top2 && (
              <div
                onClick={() => setSelectedUserForCard(top2)}
                className="bg-darkCard/80 border border-neutral-700 rounded-3xl p-3 sm:p-5 text-center space-y-2 sm:space-y-3 cursor-pointer hover:border-neutral-500 transition-all h-[210px] sm:h-[240px] flex flex-col justify-end relative shadow-lg"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-neutral-700 border border-neutral-500 text-neutral-200 text-xs font-black flex items-center justify-center">
                  2
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-neutral-800 border border-neutral-600 flex items-center justify-center text-lg mx-auto">
                  🥈
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                    {top2.name}
                  </h4>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {top2.dogs_fed} fed • {top2.rescues} rescued
                  </p>
                </div>
                <div className="px-2 py-1 rounded-xl bg-neutral-800 text-neutral-200 font-black text-xs sm:text-sm">
                  {top2.karma} pts
                </div>
              </div>
            )}

            {/* #1 Gold Champion Podium (Tallest) */}
            {top1 && (
              <div
                onClick={() => setSelectedUserForCard(top1)}
                className="bg-gradient-to-b from-amber-950/60 to-darkCard border-2 border-pawAmber rounded-3xl p-3 sm:p-5 text-center space-y-2 sm:space-y-3 cursor-pointer hover:border-amber-400 transition-all h-[250px] sm:h-[280px] flex flex-col justify-end relative shadow-2xl shadow-pawAmber/20"
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-pawAmber animate-bounce">
                  <Crown className="w-7 h-7" />
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-2xl mx-auto shadow-lg shadow-pawAmber/40">
                  🥇
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-400">
                    City Champion
                  </span>
                  <h4 className="text-sm sm:text-base font-black text-white truncate">
                    {top1.name}
                  </h4>
                  <p className="text-[11px] text-amber-200/70 truncate">
                    {top1.dogs_fed} fed • {top1.rescues} rescued
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-pawAmber text-white font-black text-sm sm:text-base shadow-md shadow-pawAmber/30">
                  {top1.karma} pts
                </div>
              </div>
            )}

            {/* #3 Bronze Guardian */}
            {top3 && (
              <div
                onClick={() => setSelectedUserForCard(top3)}
                className="bg-darkCard/80 border border-amber-900/60 rounded-3xl p-3 sm:p-5 text-center space-y-2 sm:space-y-3 cursor-pointer hover:border-amber-700 transition-all h-[190px] sm:h-[220px] flex flex-col justify-end relative shadow-lg"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-amber-950 border border-amber-800 text-amber-400 text-xs font-black flex items-center justify-center">
                  3
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-lg mx-auto">
                  🥉
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                    {top3.name}
                  </h4>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {top3.dogs_fed} fed • {top3.rescues} rescued
                  </p>
                </div>
                <div className="px-2 py-1 rounded-xl bg-amber-950/60 text-amber-300 font-black text-xs sm:text-sm">
                  {top3.karma} pts
                </div>
              </div>
            )}
          </div>
        )}

        {/* 📋 Full Ranked Feeder List */}
        <div className="bg-darkCard border border-darkBorder rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-darkBorder pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Award className="w-4 h-4 text-pawAmber" />
              <span>All Community Rescuers & Feeders</span>
            </h3>
            <span className="text-xs text-neutral-500 font-semibold">
              {leaders.length} Active Volunteers
            </span>
          </div>

          <div className="space-y-2.5">
            {leaders.map((leader, index) => {
              const rankNum = index + 1;
              const isCurrentUser =
                leader.name.toLowerCase() === currentUserName.toLowerCase();

              return (
                <div
                  key={leader.id || index}
                  className={`p-3 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    isCurrentUser
                      ? "bg-amber-950/30 border-pawAmber/70 shadow-md shadow-pawAmber/10"
                      : "bg-darkBg border-darkBorder/80 hover:border-darkBorder"
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        rankNum === 1
                          ? "bg-amber-500 text-black font-black"
                          : rankNum === 2
                          ? "bg-neutral-600 text-white"
                          : rankNum === 3
                          ? "bg-amber-900 text-amber-200"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      #{rankNum}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-xs sm:text-sm truncate">
                          {leader.name}
                        </span>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded bg-pawAmber text-white text-[9px] font-black uppercase">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-neutral-400">
                        <span>🍖 {leader.dogs_fed} fed</span>
                        <span>•</span>
                        <span>🚑 {leader.rescues} rescued</span>
                      </div>
                    </div>
                  </div>

                  {/* Karma & Card Action */}
                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-black text-pawAmber">
                        {leader.karma}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-semibold">
                        Karma Pts
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedUserForCard({ ...leader, rank: rankNum } as any)}
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                      title="Generate Impact Story Card"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Shareable Achievement Card Modal */}
      {selectedUserForCard && (
        <AchievementCardModal
          volunteerName={selectedUserForCard.name}
          dogsFed={selectedUserForCard.dogs_fed}
          rescues={selectedUserForCard.rescues}
          reportsMade={selectedUserForCard.reports_made}
          karmaPoints={selectedUserForCard.karma}
          onClose={() => setSelectedUserForCard(null)}
        />
      )}
    </div>
  );
}
