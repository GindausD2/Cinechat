import { describe, expect, it } from "vitest";
import { planViewportLayout } from "../../src/lib/viewport-layout";

describe("available-space viewport planning", () => {
  it("keeps ordinary and unsupported browsers on their existing responsive layout", () => {
    for (const width of [280, 320, 390, 768, 1440, 3440]) expect(planViewportLayout(width, 900, undefined).mode).toBe("none");
    expect(planViewportLayout(390, 844, [{ x: 0, y: 0, width: 390, height: 844 }]).columns).toBeNull();
  });
  it("allocates video and chat around a real horizontal hinge", () => {
    const result = planViewportLayout(1114, 720, [{ x: 574, y: 0, width: 540, height: 720 }, { x: 0, y: 0, width: 540, height: 720 }]);
    expect(result.mode).toBe("horizontal"); expect(result.primary.x).toBe(0);
    expect(result.columns).toEqual({ left: 486, gap: 88, right: 486 });
    expect(result.columns!.left + result.columns!.gap + result.columns!.right).toBe(1114 - result.gutter * 2);
  });
  it("keeps narrow dual panes vertical within a single safe screen", () => {
    const result = planViewportLayout(818, 800, [{ x: 0, y: 0, width: 400, height: 800 }, { x: 418, y: 0, width: 400, height: 800 }]);
    expect(result.mode).toBe("horizontal"); expect(result.columns).toBeNull(); expect(result.primary.width).toBe(400);
  });
  it("uses one safe scrollable pane for a horizontal fold across the display", () => {
    const result = planViewportLayout(800, 740, [{ x: 0, y: 0, width: 800, height: 360 }, { x: 0, y: 394, width: 800, height: 346 }]);
    expect(result.mode).toBe("vertical"); expect(result.primary).toEqual({ x: 0, y: 0, width: 800, height: 360 }); expect(result.columns).toBeNull();
  });
  it("isolates asymmetric or more complex screens without inventing a hinge layout", () => {
    expect(planViewportLayout(1100, 900, [{ x: 0, y: 0, width: 500, height: 700 }, { x: 540, y: 0, width: 560, height: 900 }])).toMatchObject({ mode: "isolated", primary: { x: 540, width: 560 } });
  });
  it("ignores invalid, duplicate and overlapping geometry", () => {
    for (const input of [[], [{ x: NaN, y: 0, width: 300, height: 900 }], [{ x: 0, y: 0, width: 400, height: 900 }, { x: 0, y: 0, width: 400, height: 900 }], [{ x: 0, y: 0, width: 700, height: 900 }, { x: 500, y: 0, width: 500, height: 900 }]]) expect(planViewportLayout(1000, 900, input).mode).toBe("none");
  });
  it("respects safe-area gutters and the maximum page width", () => {
    const result = planViewportLayout(3440, 1440, [{ x: 0, y: 0, width: 1700, height: 1440 }, { x: 1740, y: 0, width: 1700, height: 1440 }], 44);
    expect(result.gutter).toBe(44); expect(result.columns).not.toBeNull();
    expect(result.columns!.left + result.columns!.gap + result.columns!.right).toBe(1600);
  });
  it("chooses a visible pane when the keyboard covers the larger lower segment", () => {
    const result = planViewportLayout(800, 900, [{ x: 0, y: 0, width: 800, height: 400 }, { x: 0, y: 434, width: 800, height: 466 }], 0, { x: 0, y: 0, width: 800, height: 350 });
    expect(result.mode).toBe("vertical"); expect(result.primary).toEqual({ x: 0, y: 0, width: 800, height: 350 });
  });
  it("returns finite fallback dimensions for invalid viewport measurements", () => {
    expect(planViewportLayout(NaN, Infinity, undefined).primary).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });
});
