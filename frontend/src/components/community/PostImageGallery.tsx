"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";

import { CommunityPostImage } from "@/src/components/community/helpers";

const MIN_HEIGHT_PX = 220;
const MAX_HEIGHT_PX = 360;
const CONTAINER_HEIGHT = `min(${MAX_HEIGHT_PX}px, 60vh)`;

const clampIndex = (index: number, total: number) => {
  if (total <= 0) return 0;
  return Math.min(Math.max(index, 0), total - 1);
};

export default function PostImageGallery({
  images,
}: {
  images: CommunityPostImage[];
}) {
  const normalized = useMemo(() => images?.filter(Boolean) ?? [], [images]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex((prev) => clampIndex(prev, normalized.length));
  }, [normalized.length]);

  if (!normalized.length) {
    return null;
  }

  const showNavigation = normalized.length > 1;

  const handlePrevious = () => {
    setActiveIndex((prev) => (prev - 1 + normalized.length) % normalized.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % normalized.length);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          position: "relative",
          borderRadius: 14,
          border: "1px solid #1f2937",
          background: "#050910",
          overflow: "hidden",
          minHeight: MIN_HEIGHT_PX,
          height: CONTAINER_HEIGHT,
        }}
      >
        <div
          style={{
            display: "flex",
            height: "100%",
            transform: `translateX(-${activeIndex * 100}%)`,
            transition: "transform 400ms ease",
            touchAction: "pan-y",
          }}
        >
          {normalized.map((image, index) => (
            <div
              key={image.image_id ?? `${image.storage_path}-${index}`}
              style={{
                flex: "0 0 100%",
                height: "100%",
                minHeight: MIN_HEIGHT_PX,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0f172a",
              }}
            >
              <img
                src={image.public_url}
                alt={image.file_name || `Post image ${index + 1}`}
                loading="lazy"
                style={{
                  maxHeight: "100%",
                  maxWidth: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          ))}
        </div>

        {showNavigation && (
          <>
            <button
              type="button"
              onClick={handlePrevious}
              aria-label="Show previous image"
              style={{
                position: "absolute",
                top: "50%",
                left: 12,
                transform: "translateY(-50%)",
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                background: "rgba(15,23,42,0.75)",
                color: "white",
                cursor: "pointer",
              }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Show next image"
              style={{
                position: "absolute",
                top: "50%",
                right: 12,
                transform: "translateY(-50%)",
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                background: "rgba(15,23,42,0.75)",
                color: "white",
                cursor: "pointer",
              }}
            >
              ›
            </button>
            <div
              style={{
                position: "absolute",
                bottom: 12,
                right: 16,
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.85)",
                color: "#f1f5f9",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {activeIndex + 1} / {normalized.length}
            </div>
          </>
        )}
      </div>

      {showNavigation && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {normalized.map((image, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={image.image_id ?? `${image.storage_path}-${index}-dot`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show image ${index + 1}`}
                style={{
                  width: isActive ? 22 : 12,
                  height: 12,
                  borderRadius: 999,
                  border: "none",
                  background: isActive ? "#38bdf8" : "#1f2937",
                  opacity: isActive ? 1 : 0.7,
                  cursor: "pointer",
                  transition: "all 180ms ease",
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
