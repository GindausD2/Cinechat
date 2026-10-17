import { expect, it } from "vitest";
import { formatMinorAmount } from "@/lib/money";
it("formats both two-decimal and zero-decimal Stripe amounts", () => { expect(formatMinorAmount(990,"usd")).toBe("$9.90"); expect(formatMinorAmount(990,"jpy")).toContain("990"); });
