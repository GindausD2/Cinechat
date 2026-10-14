import type { NextConfig } from "next";
const allowedMedia = (process.env.MEDIA_ALLOWED_HOSTS || "download.blender.org").split(",").map(v => v.trim()).filter(v => /^[a-z0-9.-]+$/i.test(v));
const mediaOrigins = allowedMedia.filter(v => !["localhost", "127.0.0.1"].includes(v)).map(v => `https://${v}`).join(" ");
const localMediaOrigins = process.env.ALLOW_LOCAL_MEDIA === "true" ? ` http://localhost:${process.env.MEDIA_PORT || "3002"} http://127.0.0.1:${process.env.MEDIA_PORT || "3002"}` : "";
const websocketOrigin = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "") + "; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' " + websocketOrigin + " " + websocketOrigin.replace(/^http/, "ws") + " " + mediaOrigins + localMediaOrigins + "; media-src 'self' blob: " + mediaOrigins + localMediaOrigins + "; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" }
    ]}];
  }
};
export default config;
