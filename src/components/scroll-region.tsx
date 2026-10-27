"use client";
import type { ReactNode, Ref, UIEventHandler, FocusEvent } from "react";

function revealHorizontalFocus(event: FocusEvent<HTMLDivElement>) {
  const region = event.currentTarget, target = event.target;
  if (target === region || region.scrollWidth <= region.clientWidth) return;
  const bounds = region.getBoundingClientRect(), focused = target.getBoundingClientRect();
  // Scroll this rail only: focusing a partially visible card must not move the page.
  if (focused.left < bounds.left + 4) region.scrollLeft -= bounds.left + 4 - focused.left;
  else if (focused.right > bounds.right - 4) region.scrollLeft += focused.right - bounds.right + 4;
}

export function ScrollRegion({ children, className, label, ref, onScroll, live = false }: { children: ReactNode; className: string; label: string; ref?: Ref<HTMLDivElement>; onScroll?: UIEventHandler<HTMLDivElement>; live?: boolean }) {
  return <div ref={ref} className={className} role={live ? "log" : "region"} aria-live={live ? "polite" : undefined} aria-label={label} tabIndex={0} onFocusCapture={revealHorizontalFocus} onScroll={onScroll}>{children}</div>;
}
