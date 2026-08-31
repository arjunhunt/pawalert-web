"use client";

import { useState, useRef } from "react";
import { Camera, Image as ImageIcon, X, Check, Upload } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

interface PhotoUploadProps {
  onPhotoReady: (photoUrl: string) => void;
  currentPhotoUrl?: string;
}

export default function PhotoUpload({
  onPhotoReady,
  currentPhotoUrl,
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string>(currentPhotoUrl || "");
  const [isUploading, setIsUploading] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Safe and lightweight image compression using HTMLImageElement
  const processImageFile = (file: File) => {
    // 1. File Type Guard: Only allow valid image formats (JPEG, PNG, WebP, HEIC)
    if (!file || !file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG, or WebP).");
      return;
    }

    // 2. File Size Guard: Reject files exceeding 15MB to prevent memory exhaustion
    if (file.size > 15 * 1024 * 1024) {
      alert("Photo file is too large (maximum 15MB). Please choose a smaller photo.");
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setPreview(dataUrl);

          // If Supabase Storage is configured, upload to bucket
          if (isSupabaseConfigured && supabase) {
            try {
              const res = await fetch(dataUrl);
              const blob = await res.blob();
              const fileName = `report-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
              const { data, error } = await supabase.storage
                .from("dog-photos")
                .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

              if (!error && data) {
                const { data: publicData } = supabase.storage
                  .from("dog-photos")
                  .getPublicUrl(fileName);

                if (publicData?.publicUrl) {
                  onPhotoReady(publicData.publicUrl);
                  setIsUploading(false);
                  return;
                }
              }
            } catch (storageError) {
              console.warn("Storage upload failed, using data URI", storageError);
            }
          }

          // Fallback: use data URI
          onPhotoReady(dataUrl);
        } catch (e) {
          console.error("Error processing photo canvas", e);
        } finally {
          setIsUploading(false);
        }
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const clearPhoto = () => {
    setPreview("");
    onPhotoReady("");
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className="w-full space-y-3">
      {/* Hidden standard gallery file input (safe against OS low memory kill) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hidden camera file input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-darkBorder bg-neutral-900 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Report Preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={clearPhoto}
            className="absolute top-3 right-3 bg-red-600/90 hover:bg-red-600 text-white p-2 rounded-xl backdrop-blur-md shadow-lg transition-transform active:scale-95"
            title="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-lg flex items-center space-x-1">
            <Check className="w-3.5 h-3.5 text-green-400" />
            <span>Photo ready</span>
          </div>
        </div>
      ) : (
        <div className="bg-darkCard/60 border border-darkBorder rounded-2xl p-6 text-center space-y-4">
          <div className="space-y-1">
            <p className="text-neutral-200 text-sm font-bold">
              Add a Photo of the Dog
            </p>
            <p className="text-neutral-400 text-xs">
              Upload from your gallery or use camera to help rescuers locate the dog
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            {/* Gallery Option (Safe & recommended on Xiaomi / low memory devices) */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-darkBg hover:bg-neutral-800 border border-darkBorder hover:border-pawAmber/50 transition-all text-xs font-bold text-neutral-200 space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-pawAmber/10 flex items-center justify-center text-pawAmber group-hover:scale-105 transition-transform">
                <ImageIcon className="w-5 h-5" />
              </div>
              <span>Choose Photo</span>
            </button>

            {/* Camera Option */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-darkBg hover:bg-neutral-800 border border-darkBorder hover:border-pawAmber/50 transition-all text-xs font-bold text-neutral-200 space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-pawAmber/10 flex items-center justify-center text-pawAmber group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <span>Take Camera Photo</span>
            </button>
          </div>

          {isUploading && (
            <p className="text-xs text-pawAmber font-semibold animate-pulse">
              Optimizing image...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
