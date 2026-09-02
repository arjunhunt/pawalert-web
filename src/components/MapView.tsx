"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { DogReport, PROBLEM_TYPE_LABELS, STATUS_LABELS } from "@/lib/types";
import { escapeHtml } from "@/lib/security";

interface MapViewProps {
  reports: DogReport[];
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  onSelectCoordinate?: (lat: number, lng: number) => void;
  interactiveSelect?: boolean;
  defaultMapType?: "satellite" | "street";
}

export default function MapView({
  reports,
  userLocation,
  onSelectCoordinate,
  interactiveSelect = false,
  defaultMapType = "satellite",
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletModuleRef = useRef<any>(null);
  const tileLayersRef = useRef<any[]>([]);
  const lastCenteredLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const [mapType, setMapType] = useState<"satellite" | "street">(defaultMapType);

  const applyTileLayer = (L: any, map: any, type: "satellite" | "street") => {
    tileLayersRef.current.forEach((layer) => {
      try {
        map.removeLayer(layer);
      } catch (e) {}
    });
    tileLayersRef.current = [];

    if (type === "satellite") {
      // ESRI High-Resolution World Imagery
      const satLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            '&copy; <a href="https://www.esri.com">Esri</a>, Earthstar Geographics',
          maxZoom: 19,
        }
      ).addTo(map);

      // Hybrid Street Names & Boundaries Overlay
      const labelsLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "",
          maxZoom: 19,
        }
      ).addTo(map);

      tileLayersRef.current = [satLayer, labelsLayer];
    } else {
      // Standard OpenStreetMap Tile Layer
      const streetLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }
      ).addTo(map);

      tileLayersRef.current = [streetLayer];
    }
  };

  // Switch tile layers dynamically when user toggles
  useEffect(() => {
    if (mapInstanceRef.current && leafletModuleRef.current) {
      applyTileLayer(leafletModuleRef.current, mapInstanceRef.current, mapType);
    }
  }, [mapType]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (typeof window === "undefined") return;

    let isMounted = true;

    // Dynamically load Leaflet on the client
    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;
      leafletModuleRef.current = L;

      // Center around user location or first report or default to India coordinates
      const centerLat = userLocation?.lat || reports[0]?.latitude || 20.1759;
      const centerLng = userLocation?.lng || reports[0]?.longitude || 72.7549;

      // If map is already initialized on this container, reuse or update it
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.setView([centerLat, centerLng], mapInstanceRef.current.getZoom());
        } catch (e) {}
      } else {
        // Clean any residual leaflet id on container
        if ((mapContainerRef.current as any)._leaflet_id) {
          (mapContainerRef.current as any)._leaflet_id = null;
        }

        try {
          const map = L.map(mapContainerRef.current, {
            zoomControl: true,
            scrollWheelZoom: !interactiveSelect,
          }).setView([centerLat, centerLng], 16);
          mapInstanceRef.current = map;

          // Apply default satellite imagery
          applyTileLayer(L, map, mapType);

          // Allow clicking on the map to pick coordinates when creating a report
          if (interactiveSelect && onSelectCoordinate) {
            map.on("click", (e: any) => {
              onSelectCoordinate(e.latlng.lat, e.latlng.lng);
            });
          }
        } catch (err) {
          console.warn("Leaflet init handled:", err);
        }
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      // Clear existing markers & circles
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker || layer instanceof L.Circle) {
          map.removeLayer(layer);
        }
      });

      // User Location Marker, High-Precision Accuracy Halo & Anti-Jitter Viewport Centering
      if (userLocation && userLocation.lat !== 0 && userLocation.lng !== 0) {
        const accuracyMeters = userLocation.accuracy ? Math.round(userLocation.accuracy) : 15;

        // Accuracy Halo Ring
        L.circle([userLocation.lat, userLocation.lng], {
          radius: Math.min(Math.max(accuracyMeters, 10), 120),
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.16,
          weight: 1.5,
          dashArray: "4, 4",
        }).addTo(map);

        // High-Precision Core Pin
        const userIcon = L.divIcon({
          className: "user-loc-pin",
          html: `<div style="background-color: #2563eb; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 14px rgba(37, 99, 235, 0.9);"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup(`<b>📍 Your Location</b><br><small style="color:#2563eb">GPS Accuracy: ±${accuracyMeters}m</small>`);

        // Anti-jitter viewport centering: only fly map if distance moved is significant or first load
        if (!interactiveSelect) {
          const prev = lastCenteredLocationRef.current;
          let shouldCenter = true;
          if (prev) {
            const dLat = Math.abs(prev.lat - userLocation.lat);
            const dLng = Math.abs(prev.lng - userLocation.lng);
            // ~10 meters threshold
            if (dLat < 0.0001 && dLng < 0.0001) {
              shouldCenter = false;
            }
          }

          if (shouldCenter) {
            map.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 0.8 });
            lastCenteredLocationRef.current = { lat: userLocation.lat, lng: userLocation.lng };
          }
        }
      }

      // Add Dog Report Pins
      reports.forEach((report) => {
        if (!report) return;
        const rLat = typeof report.latitude === "number" ? report.latitude : parseFloat(String(report.latitude));
        const rLng = typeof report.longitude === "number" ? report.longitude : parseFloat(String(report.longitude));
        if (isNaN(rLat) || isNaN(rLng)) return;

        const catInfo = (report.problem_type && PROBLEM_TYPE_LABELS[report.problem_type]) ? PROBLEM_TYPE_LABELS[report.problem_type] : PROBLEM_TYPE_LABELS.OTHER;
        const statusInfo = (report.status && STATUS_LABELS[report.status]) ? STATUS_LABELS[report.status] : STATUS_LABELS.OPEN;

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
              width: 38px;
              height: 38px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid white;
              box-shadow: 0 4px 14px rgba(0,0,0,0.6);
              cursor: ${interactiveSelect ? "grab" : "pointer"};
              ${interactiveSelect ? "animation: pulse 1.8s infinite;" : ""}
            ">
              <span style="transform: rotate(45deg); font-size: 18px;">${catInfo.icon}</span>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 38],
          popupAnchor: [0, -34],
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
              ${escapeHtml(report.address) || "Location recorded"} ${report.landmark ? `<br><small style="color:#d97706">📍 ${escapeHtml(report.landmark)}</small>` : ""}
            </div>
            ${
              interactiveSelect
                ? `<div style="font-size: 11px; color: #EF6C00; font-weight: bold;">📍 Drag pin or tap map to adjust spot</div>`
                : `<a href="/alert/${encodeURIComponent(report.id)}" style="
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
                  </a>`
            }
          </div>
        `;

        const marker = L.marker([rLat, rLng], {
          icon: customPin,
          draggable: interactiveSelect,
        }).addTo(map);

        if (interactiveSelect && onSelectCoordinate) {
          marker.on("dragend", (e: any) => {
            const pos = e.target.getLatLng();
            onSelectCoordinate(pos.lat, pos.lng);
          });
        }

        marker.bindPopup(popupContent);
      });
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, [reports, userLocation, interactiveSelect, onSelectCoordinate]);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-darkBorder bg-darkCard">
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />

      {/* 🛰️ Satellite vs 🗺️ Street Map Toggle Switch */}
      <div className="absolute top-3 right-3 z-[1000] bg-black/80 backdrop-blur-md border border-neutral-700/80 rounded-2xl p-1 flex items-center space-x-1 shadow-2xl">
        <button
          type="button"
          onClick={() => setMapType("satellite")}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1 ${
            mapType === "satellite"
              ? "bg-pawAmber text-white shadow-md shadow-pawAmber/30 scale-100"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <span>🛰️</span>
          <span>Satellite</span>
        </button>
        <button
          type="button"
          onClick={() => setMapType("street")}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1 ${
            mapType === "street"
              ? "bg-pawAmber text-white shadow-md shadow-pawAmber/30 scale-100"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <span>🗺️</span>
          <span>Street</span>
        </button>
      </div>
    </div>
  );
}
