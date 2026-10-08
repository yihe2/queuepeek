import { describe, expect, it } from "vitest";

import { normalizeMessage } from "../src/grouping/messages";

describe("normalizeMessage", () => {
  it("collapses runs of whitespace and trims", () => {
    expect(normalizeMessage("  payment\tgateway \n timeout ")).toBe("payment gateway timeout");
  });

  it("leaves an empty message empty", () => {
    expect(normalizeMessage("")).toBe("");
  });
});
