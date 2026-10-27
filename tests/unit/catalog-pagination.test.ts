import { describe, expect, it } from "vitest";
import { catalogCursor, readCatalogCursor } from "../../src/lib/catalog-pagination";

describe("catalog cursors", () => {
  it("preserves the timestamp and ID tie-breaker without depending on row existence", () => {
    const row = { createdAt: new Date("2026-10-18T12:30:42.123Z"), id: "open-film-02" };
    expect(readCatalogCursor(catalogCursor(row))).toEqual(row);
    expect(readCatalogCursor()).toBeNull();
  });
  it("rejects malformed, oversized and incorrectly typed page positions", () => {
    for (const value of ["not-json", "x".repeat(513), "../bad", Buffer.from(JSON.stringify({ id: "", createdAt: "yesterday" })).toString("base64url")]) expect(() => readCatalogCursor(value)).toThrow("cursor is invalid");
  });
});
