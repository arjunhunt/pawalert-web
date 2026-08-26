"use client";

import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Sparkles, Smartphone } from "lucide-react";

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  useEffect(() => {
    // 1. Check if already installed & running in standalone mode
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // 2. Check if dismissed previously
    const dismissed = localStorage.getItem("pawalert_pwa_dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 4. Capture standard Android/Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Trigger native Android install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      // Show iOS step-by-step instructions
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("pawalert_pwa_dismissed", "true");
  };

  // Don't render if already in standalone app mode or dismissed
  if (isStandalone || isDismissed) return null;

  return (
    <>
      {/* Floating Install Prompt Banner */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-md animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-darkCard/95 border-2 border-pawAmber/60 rounded-3xl p-4 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-pawAmber/20">
              <Smartphone className="w-6 h-6" />
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-black text-white">
                  Install PawAlert App
                </span>
                <Sparkles className="w-3.5 h-3.5 text-pawAmber animate-pulse" />
              </div>
              <p className="text-[11px] text-neutral-300 truncate">
                Instant 1-tap full-screen access on your home screen.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs font-bold shadow-md shadow-pawAmber/20 transition-all flex items-center space-x-1.5 whitespace-nowrap active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Step-by-Step Installation Modal */}
      {showIosGuide && (
        <div
          onClick={() => setShowIosGuide(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-darkCard border border-darkBorder rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-pawAmber/20 flex items-center justify-center text-pawAmber font-bold text-sm">
                  🐾
                </div>
                <h3 className="font-bold text-white text-sm">
                  Install on iPhone / iPad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Install PawAlert to your iPhone home screen in 2 quick taps:
            </p>

            <div className="space-y-3 text-xs bg-darkBg/60 border border-darkBorder/60 p-4 rounded-2xl">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center text-pawAmber shrink-0 font-bold">
                  1
                </div>
                <p className="text-neutral-300">
                  Tap the <b className="text-white">Share button</b> (<Share className="w-3.5 h-3.5 inline text-pawAmber" />) in Safari's bottom toolbar.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center text-pawAmber shrink-0 font-bold">
                  2
                </div>
                <p className="text-neutral-300">
                  Scroll down and tap <b className="text-white">"Add to Home Screen"</b> (<PlusSquare className="w-3.5 h-3.5 inline text-pawAmber" />).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs font-bold transition-all shadow-md shadow-pawAmber/20"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
