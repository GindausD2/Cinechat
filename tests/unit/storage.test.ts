import { afterEach, expect, it, vi } from "vitest";
import { objectStorageClient } from "@/lib/object-storage";
afterEach(() => vi.unstubAllEnvs());
it("requires explicit object storage configuration", () => { vi.stubEnv("OBJECT_STORAGE_BUCKET", ""); expect(() => objectStorageClient()).toThrow("Object storage credentials are not configured"); });
