"use client";

import { useEffect, useState } from "react";

import { potionForEffect } from "@/lib/rpg-assets";

interface RpgIconProps {
  src: string;
  fallbackEmoji: string;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}

const DEFAULT_CLASS =
  "inline-block h-5 w-5 shrink-0 align-middle object-contain";

export function RpgIcon({
  src,
  fallbackEmoji,
  alt = "",
  className = DEFAULT_CLASS,
  fallbackClassName,
}: RpgIconProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError) {
    return (
      <span
        className={
          fallbackClassName ??
          `inline-flex shrink-0 items-center justify-center leading-none ${className}`
        }
        aria-hidden={alt === ""}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
      >
        {fallbackEmoji}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setHasError(true)}
    />
  );
}

export function PotionIcon({
  effectId,
  fallbackEmoji,
  alt = "",
  className = DEFAULT_CLASS,
}: {
  effectId: number;
  fallbackEmoji: string;
  alt?: string;
  className?: string;
}) {
  return (
    <RpgIcon
      src={potionForEffect(effectId)}
      fallbackEmoji={fallbackEmoji}
      alt={alt}
      className={className}
    />
  );
}
