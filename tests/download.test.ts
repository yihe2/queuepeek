import { describe, expect, it } from "vitest";

import { exportFileName } from "../src/ui/download";

const at = new Date("2026-11-10T15:04:59Z");

describe("exportFileName", () => {
  it("names the file after the dump, the kind, and the UTC minute", () => {
    expect(exportFileName("orders-dlq.json", "retry", at)).toBe("orders-dlq.retry.20261110-1504.json");
    expect(exportFileName("dead-set.JSONL", "poison", at)).toBe("dead-set.poison.20261110-1504.json");
  });

  it("replaces characters that are awkward in file names", () => {
    expect(exportFileName("prod dump (copy).json", "leftover", at)).toBe("prod-dump-copy.leftover.20261110-1504.json");
  });

  it("falls back to a generic name", () => {
    expect(exportFileName(".json", "retry", at)).toBe("dump.retry.20261110-1504.json");
    expect(exportFileName("", "retry", at)).toBe("dump.retry.20261110-1504.json");
  });
});
