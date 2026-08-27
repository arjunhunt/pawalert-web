"use client";

import { useState } from "react";
import {
  X,
  Share2,
  Copy,
  CheckCircle2,
  Sparkles,
  Dog,
  ExternalLink,
  MessageCircle,
  Send,
  QrCode,
} from "lucide-react";

interface ShareAppModalProps {
  onClose: () => void;
}

export default function ShareAppModal({ onClose }: ShareAppModalProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const appUrl = "https://pawalert-web.vercel.app";
  const shareMessage = `🐾 Help stray dogs in our city! Join PawAlert to feed hungry dogs, broadcast medical emergencies, and rescue injured animals together: ${appUrl}`;

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
  };

  const handleShareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent("🐾 Join PawAlert — Community Stray Dog Rescue & Feeding Network!")}`;
    window.open(url, "_blank");
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "PawAlert - Community Stray Dog Network",
        text: shareMessage,
        url: appUrl,
      });
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
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

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-pawAmber/40 flex items-center justify-center text-pawAmber mx-auto shadow-lg shadow-pawAmber/10">
            <Dog className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white flex items-center justify-center space-x-2">
            <span>Share PawAlert App</span>
            <Sparkles className="w-4 h-4 text-pawAmber" />
          </h2>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto">
            Invite fellow animal lovers, colony feeders, and society groups to save stray dogs together!
          </p>
        </div>

        {/* App Preview Card */}
        <div className="bg-darkBg/80 border border-darkBorder rounded-2xl p-4 space-y-2 text-left">
          <div className="flex items-center space-x-2 text-pawAmber text-xs font-bold">
            <span>🐾 PawAlert App</span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed">
            &ldquo;Real-time community stray dog feeding, distress alerts, and emergency rescue network.&rdquo;
          </p>
          <div className="text-[11px] text-neutral-500 font-mono">
            {appUrl}
          </div>
        </div>

        {/* Quick Share Buttons */}
        <div className="space-y-3">
          {/* WhatsApp 1-Tap */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full py-3 px-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-green-600/20 transition-all active:scale-98"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Share to WhatsApp Groups & Status</span>
          </button>

          {/* Telegram & Other Apps */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShareTelegram}
              className="py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegram</span>
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="py-2.5 px-3 rounded-xl bg-pawAmber/20 hover:bg-pawAmber/30 border border-pawAmber/40 text-pawAmber font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>More Apps...</span>
            </button>
          </div>

          {/* Copy Link Input Bar */}
          <div className="pt-2">
            <div className="flex items-center bg-darkBg border border-darkBorder rounded-xl p-1.5">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="bg-transparent text-xs text-neutral-300 px-3 py-1.5 flex-1 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-1.5 rounded-lg bg-pawAmber hover:bg-pawAmber-hover text-white text-xs font-bold transition-all flex items-center space-x-1 shrink-0"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
