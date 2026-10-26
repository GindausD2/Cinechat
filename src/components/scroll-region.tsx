import type { ReactNode, Ref, UIEventHandler } from "react";

export function ScrollRegion({ children, className, label, ref, onScroll, live = false }: { children: ReactNode; className: string; label: string; ref?: Ref<HTMLDivElement>; onScroll?: UIEventHandler<HTMLDivElement>; live?: boolean }) {
  return <div ref={ref} className={className} role={live ? "log" : "region"} aria-live={live ? "polite" : undefined} aria-label={label} tabIndex={0} onScroll={onScroll}>{children}</div>;
}
