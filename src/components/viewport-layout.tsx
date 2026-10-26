"use client";
import { useEffect, type ReactNode } from "react";
import { planViewportLayout, type ViewportRect } from "@/lib/viewport-layout";

type SegmentedViewport = EventTarget & { readonly segments?: readonly ViewportRect[] | null };
type SegmentWindow = Window & { readonly viewport?: SegmentedViewport };

/** Progressive enhancement. Geometry updates CSS without rendering or replacing media. */
export function ViewportLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement, nativeViewport = (window as SegmentWindow).viewport;
    const horizontal = matchMedia("(horizontal-viewport-segments: 2)"), vertical = matchMedia("(vertical-viewport-segments: 2)");
    const probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;contain:strict;left:0;top:0;width:1px;height:1px;padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)";
    document.body.appendChild(probe);
    let frame = 0, previous = "";
    const properties = ["--screen-safe-x", "--screen-safe-y", "--screen-safe-width", "--screen-safe-height", "--screen-gutter", "--screen-column-left", "--screen-column-gap", "--screen-column-right", "--screen-viewport-height"];
    function readSegments() {
      try { if (nativeViewport?.segments && nativeViewport.segments.length > 1) return nativeViewport.segments; } catch { /* Experimental getters may be unavailable. */ }
      if (!horizontal.matches && !vertical.matches) return null;
      const result: ViewportRect[] = [];
      for (let index = 0; index < 2; index++) {
        const pair = horizontal.matches ? `${index} 0` : `0 ${index}`;
        for (const property of ["left", "top", "width", "height"] as const) probe.style[property] = `env(viewport-segment-${property} ${pair}, -1px)`;
        const style = getComputedStyle(probe);
        result.push({ x: parseFloat(style.left), y: parseFloat(style.top), width: parseFloat(style.width), height: parseFloat(style.height) });
      }
      return result;
    }
    function update() {
      const safeArea = getComputedStyle(probe);
      const minimumGutter = Math.max(parseFloat(safeArea.paddingLeft) || 0, parseFloat(safeArea.paddingRight) || 0);
      const viewport = window.visualViewport;
      const visible = viewport && viewport.scale === 1 && viewport.height < innerHeight - 120 ? { x: 0, y: viewport.offsetTop, width: innerWidth, height: viewport.height } : undefined;
      const plan = planViewportLayout(innerWidth, innerHeight, readSegments(), minimumGutter, visible);
      const signature = JSON.stringify(plan); if (signature === previous) return; previous = signature;
      if (plan.mode === "none") {
        delete root.dataset.screenSegments; delete root.dataset.screenColumns;
        for (const property of properties) root.style.removeProperty(property);
      } else {
        root.dataset.screenSegments = plan.mode;
        root.dataset.screenColumns = plan.columns ? "true" : "false";
        const values = [plan.primary.x, plan.primary.y, plan.primary.width, plan.primary.height, plan.gutter, plan.columns?.left || 0, plan.columns?.gap || 0, plan.columns?.right || 0, innerHeight];
        properties.forEach((property, index) => root.style.setProperty(property, `${values[index]}px`));
      }
      window.dispatchEvent(new Event("cinechat:viewport-layout"));
    }
    function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); }
    window.addEventListener("resize", schedule); window.addEventListener("orientationchange", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    nativeViewport?.addEventListener?.("segmentschange", schedule);
    horizontal.addEventListener("change", schedule); vertical.addEventListener("change", schedule); update();
    return () => {
      cancelAnimationFrame(frame); probe.remove();
      window.removeEventListener("resize", schedule); window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule); nativeViewport?.removeEventListener?.("segmentschange", schedule);
      horizontal.removeEventListener("change", schedule); vertical.removeEventListener("change", schedule);
      delete root.dataset.screenSegments; delete root.dataset.screenColumns;
      for (const property of properties) root.style.removeProperty(property);
    };
  }, []);
  return <div className="viewport-shell">{children}</div>;
}
