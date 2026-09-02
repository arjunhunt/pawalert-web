"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  X,
  Volume2,
  RefreshCw,
  ArrowRight,
  Flame,
} from "lucide-react";
import { parseSpokenRescueText, ParsedVoiceReport } from "@/lib/voiceParser";
import { PROBLEM_TYPE_LABELS } from "@/lib/types";

interface VoiceSOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyVoiceReport: (parsed: ParsedVoiceReport) => void;
}

export default function VoiceSOSModal({
  isOpen,
  onClose,
  onApplyVoiceReport,
}: VoiceSOSModalProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [language, setLanguage] = useState<"en-IN" | "hi-IN">("en-IN");
  const [parsedResult, setParsedResult] = useState<ParsedVoiceReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  const startListening = async () => {
    setErrorMessage("");
    setParsedResult(null);
    setTranscript("");

    // 1. Explicitly prompt user for microphone permission via getUserMedia
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release the audio track immediately after permission is confirmed
        stream.getTracks().forEach((track) => track.stop());
      } catch (permissionErr: any) {
        console.warn("Microphone permission error:", permissionErr);
        setErrorMessage("Microphone permission was blocked. Please tap 'Allow' in your browser permissions bar.");
        setIsRecording(false);
        return;
      }
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Voice recognition is not supported in this browser. Please use Google Chrome, Safari, or Edge.");
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsRecording(true);
        setErrorMessage("");
      };

      recognition.onresult = (event: any) => {
        let currentText = "";
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + " ";
        }
        const trimmed = currentText.trim();
        setTranscript(trimmed);

        if (trimmed.length > 3) {
          const parsed = parseSpokenRescueText(trimmed);
          setParsedResult(parsed);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage("Microphone permission was not allowed. Please allow microphone in browser settings.");
        } else if (event.error !== "no-speech") {
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error("Failed to start speech recognition", e);
      setErrorMessage("Could not start microphone. Please check browser permissions.");
      setIsRecording(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleApply = () => {
    if (parsedResult) {
      onApplyVoiceReport(parsedResult);
      onClose();
    }
  };

  // Cleanup on unmount or when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const categoryInfo = parsedResult
    ? PROBLEM_TYPE_LABELS[parsedResult.problemType]
    : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-darkCard border border-darkBorder rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative my-8 animate-in zoom-in-95 duration-150 text-center"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 pt-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pawAmber/15 border border-pawAmber/30 text-pawAmber text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-pawAmber" />
            <span>AI Voice SOS Engine</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Speak to Report Stray Dog
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Describe the dog, wound, and landmark in Hindi or English. AI will extract everything automatically!
          </p>
        </div>

        {/* Language Selector */}
        <div className="flex items-center justify-center space-x-2">
          <button
            type="button"
            onClick={() => setLanguage("en-IN")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              language === "en-IN"
                ? "bg-pawAmber text-white shadow-md shadow-pawAmber/20"
                : "bg-darkBg border border-darkBorder text-neutral-400 hover:text-white"
            }`}
          >
            🇮🇳 Hinglish / English
          </button>
          <button
            type="button"
            onClick={() => setLanguage("hi-IN")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              language === "hi-IN"
                ? "bg-pawAmber text-white shadow-md shadow-pawAmber/20"
                : "bg-darkBg border border-darkBorder text-neutral-400 hover:text-white"
            }`}
          >
            🇮🇳 हिन्दी (Hindi)
          </button>
        </div>

        {/* Animated Microphone Action Button */}
        <div className="py-2 flex flex-col items-center justify-center space-y-3">
          <div className="relative">
            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <div className="absolute -inset-3 rounded-full bg-pawAmber/20 animate-pulse" />
              </>
            )}

            <button
              type="button"
              onClick={toggleRecording}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 ${
                isRecording
                  ? "bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-red-600/50 scale-105"
                  : "bg-gradient-to-tr from-pawAmber to-amber-500 text-white shadow-pawAmber/40 hover:scale-105"
              }`}
            >
              {isRecording ? (
                <Mic className="w-10 h-10 animate-bounce" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>
          </div>

          <span className="text-xs font-black tracking-wide uppercase text-neutral-300">
            {isRecording ? "🔴 Listening... Speak naturally" : "Tap Mic to Start Speaking"}
          </span>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs font-semibold flex items-center justify-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Streaming Transcription / Editable Box */}
        <div className="p-3.5 rounded-2xl bg-darkBg border border-darkBorder text-left space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-neutral-500 tracking-wider">
              {isRecording ? "🔴 Transcribing Live Speech..." : "Spoken Text (Editable):"}
            </span>
            {transcript && (
              <button
                type="button"
                onClick={() => {
                  setTranscript("");
                  setParsedResult(null);
                }}
                className="text-[10px] text-neutral-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            rows={2}
            value={transcript}
            onChange={(e) => {
              const val = e.target.value;
              setTranscript(val);
              if (val.trim().length > 3) {
                setParsedResult(parseSpokenRescueText(val));
              } else {
                setParsedResult(null);
              }
            }}
            placeholder='Tap the mic above and speak, or type: "Station road pe chai stall ke pass ek brown puppy hai bleeding ho rahi hai..."'
            className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* AI Extracted Intelligence Preview Card */}
        {parsedResult && parsedResult.rawText.length > 3 && (
          <div className="p-4 rounded-2xl bg-gradient-to-b from-neutral-900 to-darkBg border border-pawAmber/40 text-left space-y-3 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-pawAmber tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Detected Rescue Plan</span>
              </span>

              {parsedResult.urgency === "CRITICAL" && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse flex items-center space-x-1">
                  <Flame className="w-3 h-3" />
                  <span>Critical Urgency</span>
                </span>
              )}
            </div>

            {/* Extracted Badges */}
            <div className="flex items-center flex-wrap gap-2">
              {categoryInfo && (
                <span className="text-xs font-extrabold px-3 py-1 rounded-xl border border-pawAmber/40 bg-neutral-800 text-white flex items-center space-x-1">
                  <span>{categoryInfo.icon}</span>
                  <span>{categoryInfo.label}</span>
                </span>
              )}

              {parsedResult.extractedLandmark && (
                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-amber-950/40 text-amber-300 border border-amber-800/40 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{parsedResult.extractedLandmark}</span>
                </span>
              )}
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleApply}
              className="w-full py-3 rounded-2xl bg-pawAmber hover:bg-pawAmber-hover text-white font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-pawAmber/20 flex items-center justify-center space-x-2 active:scale-95"
            >
              <span>Auto-Fill & Review Report Form</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
