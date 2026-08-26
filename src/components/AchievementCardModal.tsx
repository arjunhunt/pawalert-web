"use client";

import { useState } from "react";
import {
  X,
  Share2,
  Sparkles,
  Award,
  Dog,
  CheckCircle2,
  Copy,
  ExternalLink,
} from "lucide-react";

interface AchievementCardModalProps {
  volunteerName: string;
  dogsFed: number;
  rescues: number;
  reportsMade: number;
  karmaPoints: number;
  rank?: number;
  onClose: () => void;
}

export default function AchievementCardModal({
  volunteerName,
  dogsFed,
  rescues,
  reportsMade,
  karmaPoints,
  rank,
  onClose,
}: AchievementCardModalProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const shareText = `🐾 I've fed ${dogsFed} stray dogs and completed ${rescues} rescues on PawAlert! Total Karma: ${karmaPoints} pts ✨\n\nJoin our community stray dog feeding and rescue network: https://pawalert-web.vercel.app`;

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `PawAlert Impact Card: ${volunteerName}`,
        text: shareText,
        url: "https://pawalert-web.vercel.app",
      });
    } else {
      handleCopyText();
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-150 relative"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1">
          <h2 className="text-lg font-black text-white flex items-center justify-center space-x-2">
            <span>Volunteer Impact Card</span>
            <Sparkles className="w-4 h-4 text-pawAmber" />
          </h2>
          <p className="text-xs text-neutral-400">
            Share your rescue impact on WhatsApp or Instagram stories!
          </p>
        </div>

        {/* The Visual Impact Story Card (Instagram / WhatsApp Layout) */}
        <div className="relative bg-gradient-to-br from-neutral-900 via-amber-950/40 to-neutral-900 border-2 border-pawAmber/60 rounded-3xl p-6 shadow-2xl space-y-5 text-center overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-pawAmber/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-600/15 rounded-full blur-2xl pointer-events-none" />

          {/* Card Header Badge */}
          <div className="flex items-center justify-between border-b border-pawAmber/20 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-pawAmber/20 border border-pawAmber/40 flex items-center justify-center text-pawAmber">
                <Dog className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-white">PawAlert</div>
                <div className="text-[10px] text-pawAmber font-semibold">Community Guardian</div>
              </div>
            </div>

            {rank && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                🏆 Rank #{rank}
              </span>
            )}
          </div>

          {/* Volunteer Avatar & Name */}
          <div className="space-y-1.5 py-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-2xl mx-auto shadow-lg shadow-pawAmber/30">
              🐾
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
              {volunteerName}
            </h3>
            <p className="text-xs text-green-400 font-semibold flex items-center justify-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified Volunteer</span>
            </p>
          </div>

          {/* Stats Counter Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="bg-darkBg/70 border border-darkBorder rounded-2xl p-2.5">
              <div className="text-lg font-black text-pawAmber">{dogsFed}</div>
              <div className="text-[10px] text-neutral-400 font-medium">Dogs Fed</div>
            </div>
            <div className="bg-darkBg/70 border border-darkBorder rounded-2xl p-2.5">
              <div className="text-lg font-black text-red-400">{rescues}</div>
              <div className="text-[10px] text-neutral-400 font-medium">Rescues</div>
            </div>
            <div className="bg-darkBg/70 border border-darkBorder rounded-2xl p-2.5">
              <div className="text-lg font-black text-amber-400">{karmaPoints}</div>
              <div className="text-[10px] text-neutral-400 font-medium">Karma Pts</div>
            </div>
          </div>

          {/* Card Footer URL */}
          <div className="pt-2 text-[10px] text-neutral-500 font-mono flex items-center justify-center space-x-1">
            <span>pawalert-web.vercel.app</span>
          </div>
        </div>

        {/* Action Share Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full py-3 rounded-2xl bg-green-600 hover:bg-green-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-green-600/20 transition-all flex items-center justify-center space-x-2"
          >
            <span>💬 Share on WhatsApp Status & Groups</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleNativeShare}
              className="py-2.5 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Card</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="py-2.5 rounded-xl bg-darkBg hover:bg-neutral-800 border border-darkBorder text-neutral-300 text-xs font-semibold transition-all flex items-center justify-center space-x-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-pawAmber" />
              <span>{copied ? "Copied!" : "Copy Text"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
