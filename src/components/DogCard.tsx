"use client";

import Link from "next/link";
import { Navigation, Clock, User, Dog, MapPin, ArrowUpRight } from "lucide-react";
import { DogReport, PROBLEM_TYPE_LABELS, STATUS_LABELS } from "@/lib/types";
import { formatDistance, formatTimeAgo } from "@/lib/geo";

interface DogCardProps {
  report: DogReport;
  distanceMeters?: number | null;
}

export default function DogCard({ report, distanceMeters }: DogCardProps) {
  const catInfo = PROBLEM_TYPE_LABELS[report.problem_type] || PROBLEM_TYPE_LABELS.OTHER;

  const isResolved = report.status === "RESOLVED";
  const isInProgress = report.status === "IN_PROGRESS";

  return (
    <Link
      href={`/alert/${report.id}`}
      className="group block bg-[#101114] hover:bg-[#14161C] border border-white/[0.08] hover:border-white/[0.18] rounded-xl overflow-hidden transition-all duration-150 flex flex-col shadow-linear hover:shadow-linearHover hover:-translate-y-0.5"
    >
      {/* Photo Container */}
      <div className="relative w-full h-44 sm:h-48 bg-[#0C0D10] overflow-hidden">
        {report.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={report.photo_url}
            alt={catInfo.label}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-linearText-subtle bg-[#0C0D10]">
            <Dog className="w-10 h-10 text-white/[0.15] mb-1" />
            <span className="text-[11px] font-mono text-linearText-muted">NO PHOTO</span>
          </div>
        )}

        {/* Linear Floating Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
          {/* Status Indicator */}
          <span
            className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium uppercase tracking-wider backdrop-blur-md border ${
              isResolved
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                : isInProgress
                ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                : "bg-rose-500/10 text-rose-400 border-rose-500/25"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isResolved
                  ? "bg-emerald-400"
                  : isInProgress
                  ? "bg-amber-400"
                  : "bg-rose-400 animate-pulse"
              }`}
            />
            <span>{isResolved ? "RESOLVED" : isInProgress ? "HELPING" : "OPEN"}</span>
          </span>

          {/* Problem Type Tag */}
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-white/90 bg-black/60 backdrop-blur-md border border-white/[0.1]">
            <span>{catInfo.icon}</span>
            <span>{catInfo.label}</span>
          </span>
        </div>

        {/* Distance Badge */}
        {distanceMeters !== undefined && distanceMeters !== null && (
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium text-white/90 bg-black/60 backdrop-blur-md border border-white/[0.1]">
              <Navigation className="w-2.5 h-2.5 text-linearAccent-coral" />
              <span>{formatDistance(distanceMeters)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div className="space-y-1">
          {/* Title */}
          <h3 className="text-sm font-semibold text-white tracking-tight line-clamp-1 group-hover:text-linearAccent-coral transition-colors flex items-center justify-between">
            <span className="truncate">{report.landmark || `${catInfo.label} Stray Dog`}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-linearText-subtle group-hover:text-linearAccent-coral opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-1" />
          </h3>

          <p className="text-xs text-linearText-muted line-clamp-2 leading-relaxed font-normal">
            {report.description}
          </p>
        </div>

        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          {/* Landmark */}
          <div className="flex items-center space-x-1 text-xs text-linearText-muted truncate font-normal">
            <MapPin className="w-3 h-3 text-linearText-subtle shrink-0" />
            <span className="truncate">{report.landmark || report.address || "Location pinned"}</span>
          </div>

          {/* Metadata Footer */}
          <div className="flex items-center justify-between text-[11px] font-mono text-linearText-subtle pt-0.5">
            <div className="flex items-center space-x-1 truncate max-w-[170px]">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{formatTimeAgo(report.created_at)}</span>
              <span>•</span>
              <span className="truncate text-linearText-muted">{report.reporter_name}</span>
            </div>

            <span className="text-[10px] font-sans font-medium text-linearText-muted group-hover:text-white transition-colors">
              Inspect →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
