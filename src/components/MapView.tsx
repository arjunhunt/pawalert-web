"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { DogReport, PROBLEM_TYPE_LABELS, STATUS_LABELS } from "@/lib/types";

interface MapViewProps {
  reports: DogReport[];
  userLocation?: { lat: number; lng: number } | null;
  onSelectCoordinate?: (lat: number, lng: number) => void;
  interactiveSelect?: boolean;
}

export default function MapView({
  reports,
  userLocation,
  onSelectCoordinate,
  interactiveSelect = false,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (typeof window === "undefined") return;

    let isMounted = true;

    // Dynamically load Leaflet on the client
    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Center around user location or first report or default to India coordinates
      const centerLat = userLocation?.lat || reports[0]?.latitude || 20.1759;
      const centerLng = userLocation?.lng || reports[0]?.longitude || 72.7549;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], 14);
        mapInstanceRef.current = map;

        // OpenStreetMap Tile Layer (100% Free, High Precision, No Watermarks)
        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }
        ).addTo(map);

        // Allow clicking on the map to pick coordinates when creating a report
        if (interactiveSelect && onSelectCoordinate) {
          map.on("click", (e: any) => {
            onSelectCoordinate(e.latlng.lat, e.latlng.lng);
          });
        }
      }

      const map = mapInstanceRef.current;

      // Clear existing markers
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
          map.removeLayer(layer);
        }
      });

      // User Location Marker
      if (userLocation) {
        const userIcon = L.divIcon({
          className: "user-loc-pin",
          html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup("<b>📍 Your Current Location</b>");
      }

      // Add Dog Report Pins
      reports.forEach((report) => {
        const catInfo = PROBLEM_TYPE_LABELS[report.problem_type] || PROBLEM_TYPE_LABELS.OTHER;
        const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.OPEN;

        const pinColor =
          report.status === "RESOLVED"
            ? "#43A047"
            : report.status === "IN_PROGRESS"
            ? "#FFB300"
            : catInfo.color;

        const customPin = L.divIcon({
          className: "paw-pin",
          html: `
            <div style="
              background-color: ${pinColor};
              width: 34px;
              height: 34px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
              box-shadow: 0 4px 10px rgba(0,0,0,0.5);
              cursor: pointer;
            ">
              <span style="transform: rotate(45deg); font-size: 16px;">${catInfo.icon}</span>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
          popupAnchor: [0, -30],
        });

        const popupContent = `
          <div style="min-width: 200px; color: #141210; font-family: system-ui, sans-serif;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${statusInfo.color}; margin-bottom: 4px;">
              ${statusInfo.label}
            </div>
            <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px;">
              ${catInfo.icon} ${catInfo.label}
            </div>
            <div style="font-size: 12px; color: #444; margin-bottom: 8px;">
              ${report.address} ${report.landmark ? `<br><small style="color:#d97706">📍 ${report.landmark}</small>` : ""}
            </div>
            <a href="/alert/${report.id}" style="
              display: block;
              text-align: center;
              background-color: #EF6C00;
              color: white;
              text-decoration: none;
              padding: 6px 12px;
              border-radius: 8px;
              font-size: 12px;
              font-weight: 700;
            ">
              View Alert & Help 🐾
            </a>
          </div>
        `;

        L.marker([report.latitude, report.longitude], { icon: customPin })
          .addTo(map)
          .bindPopup(popupContent);
      });
    });

    return () => {
      isMounted = false;
    };
  }, [reports, userLocation, interactiveSelect, onSelectCoordinate]);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-darkBorder bg-darkCard">
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />
    </div>
  );
}
