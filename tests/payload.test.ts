import { describe, expect, it } from "vitest";
import { prettyPayload } from "../src/ui/payload";
import { makeJob } from "./job-factory";

describe("prettyPayload", () => {
  it("indents structured payloads", () => {
    const job = makeJob({ payload: { order: 42, items: ["a"] }, payloadText: '{"order":42,"items":["a"]}' });

    expect(prettyPayload(job)).toBe('{\n  "order": 42,\n  "items": [\n    "a"\n  ]\n}');
  });

  it("keeps the original text for string payloads", () => {
    const job = makeJob({ payload: "not json {", payloadText: "not json {" });

    expect(prettyPayload(job)).toBe("not json {");
  });

  it("falls back to the original text when there is no payload", () => {
    expect(prettyPayload(makeJob({ payload: undefined, payloadText: "" }))).toBe("");
    expect(prettyPayload(makeJob({ payload: null, payloadText: "null" }))).toBe("null");
  });
});
