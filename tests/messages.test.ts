import { describe, expect, it } from "vitest";

import { normalizeMessage } from "../src/grouping/messages";

describe("normalizeMessage", () => {
  it("collapses runs of whitespace and trims", () => {
    expect(normalizeMessage("  payment\tgateway \n timeout ")).toBe("payment gateway timeout");
  });

  it("leaves an empty message empty", () => {
    expect(normalizeMessage("")).toBe("");
  });

  it("masks UUIDs", () => {
    expect(normalizeMessage("order 5f1c2a9e-3b7d-4c11-9a2e-8d4f0b6e71a1 not found")).toBe("order <uuid> not found");
  });

  it("masks numbers and durations without touching identifiers", () => {
    expect(normalizeMessage("Task timed out after 30.00 seconds")).toBe("Task timed out after <n> seconds");
    expect(normalizeMessage("lock wait exceeded 5000ms")).toBe("lock wait exceeded <n>ms");
    expect(normalizeMessage("Base64 decode failed")).toBe("Base64 decode failed");
  });

  it("masks object addresses and long hex ids", () => {
    expect(normalizeMessage("#<Order:0x00007f8b1c2d3e40> is frozen")).toBe("#<Order:<hex>> is frozen");
    expect(normalizeMessage("job 3f9b2c7d1e4a5b6c7d8e9f01 lost")).toBe("job <id> lost");
  });

  it("masks double-quoted values", () => {
    expect(normalizeMessage('unknown column "legacy_sku" in field list')).toBe("unknown column <str> in field list");
  });

  it("makes messages that differ only by ids equal", () => {
    expect(normalizeMessage("user 41 not found")).toBe(normalizeMessage("user 977 not found"));
  });
});
