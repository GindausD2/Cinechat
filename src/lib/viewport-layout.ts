/** Ephemeral CSS-pixel geometry; no device names, identifiers or persisted display data. */
export type ViewportRect = { x: number; y: number; width: number; height: number };
export type ViewportLayout = {
  mode: "none" | "horizontal" | "vertical" | "isolated";
  primary: ViewportRect;
  gutter: number;
  columns: { left: number; gap: number; right: number } | null;
};

export function planViewportLayout(width: number, height: number, input: readonly ViewportRect[] | null | undefined, minimumGutter = 0, visible?: ViewportRect): ViewportLayout {
  const whole = { x: 0, y: 0, width: Number.isFinite(width) ? Math.max(1, width) : 1, height: Number.isFinite(height) ? Math.max(1, height) : 1 };
  const fallback: ViewportLayout = { mode: "none", primary: whole, gutter: 16, columns: null };
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || !input) return fallback;
  const segments = input.filter(rect => [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)
    && rect.x >= 0 && rect.y >= 0 && rect.width >= 1 && rect.height >= 1
    && rect.x + rect.width <= width + 1 && rect.y + rect.height <= height + 1)
    .map(rect => ({ x: rect.x, y: rect.y, width: Math.min(rect.width, width - rect.x), height: Math.min(rect.height, height - rect.y) }))
    .filter((rect, index, all) => all.findIndex(other => JSON.stringify(other) === JSON.stringify(rect)) === index)
    .sort((a, b) => a.x - b.x || a.y - b.y);
  if (segments.length < 2) return fallback;
  // Malformed overlapping rectangles must not activate a segmented layout.
  if (segments.some((a, i) => segments.some((b, j) => i < j && Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x) + 1 && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y) + 1))) return fallback;
  const first = segments[0], second = segments[1];
  const horizontal = segments.length === 2 && first.x + first.width <= second.x + 1 && first.y === 0 && second.y === 0 && Math.abs(first.height - height) <= 1 && Math.abs(second.height - height) <= 1;
  const vertical = segments.length === 2 && first.y + first.height <= second.y + 1 && first.x === 0 && second.x === 0 && Math.abs(first.width - width) <= 1 && Math.abs(second.width - width) <= 1;
  const available = visible ? segments.map(rect => {
    const x = Math.max(rect.x, visible.x), y = Math.max(rect.y, visible.y);
    return { x, y, width: Math.max(0, Math.min(rect.x + rect.width, visible.x + visible.width) - x), height: Math.max(0, Math.min(rect.y + rect.height, visible.y + visible.height) - y) };
  }).filter(rect => rect.width > 0 && rect.height > 0) : segments;
  const candidates = available.length ? available : segments;
  const primary = horizontal && candidates[0].width >= 280 ? candidates[0] : candidates.reduce((a, b) => a.width * a.height >= b.width * b.height ? a : b);
  const gutter = Math.max(minimumGutter, Math.min(28, Math.max(16, primary.width * .05)));
  let columns: ViewportLayout["columns"] = null;
  if (horizontal) {
    const pageInset = Math.max(gutter, (width - 1600) / 2);
    const left = first.x + first.width - pageInset - gutter;
    const right = width - pageInset - second.x - gutter;
    // A movie needs a useful picture and controls; width alone never forces two columns.
    if (left >= 480 && right >= 280) columns = { left, gap: second.x - first.x - first.width + gutter * 2, right };
  }
  return { mode: horizontal ? "horizontal" : vertical ? "vertical" : "isolated", primary, gutter, columns };
}
