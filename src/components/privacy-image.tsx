"use client";
import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { isExternalImage, isLocalImage } from "@/lib/cookie-preferences";
import { useCookiePreferences } from "./cookie-preferences";
export function PrivacyImage({ src, alt, ...props }: ImageProps) {
  const { externalImages, requestOptionalImages } = useCookiePreferences();
  const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null);
  const external = typeof src === "string" && !isLocalImage(src);
  useEffect(() => { if (external && !externalImages) requestOptionalImages(); }, [external, externalImages, requestOptionalImages]);
  const hidden = external && (!externalImages || !isExternalImage(src as string));
  if (hidden || failedSrc === src) return alt ? <span className="external-image-placeholder" role="img" aria-label={`${alt} — ${hidden ? "external image hidden" : "image unavailable"}`}><span>{hidden ? "External image hidden" : "Image unavailable"}</span></span> : null;
  return <Image {...props} onError={event => { setFailedSrc(src); props.onError?.(event); }} src={src} alt={alt} {...(external ? { unoptimized: true, crossOrigin: "anonymous", referrerPolicy: "no-referrer" } : {})} />;
}
