import { describe, expect, it } from "vitest";

import { groupJobs } from "../src/grouping";
import { fnv1a32, groupId } from "../src/grouping/ids";
import { makeJob } from "./job-factory";

describe("fnv1a32", () => {
  it("matches the published FNV-1a test vectors", () => {
    expect(fnv1a32("").toString(16)).toBe("811c9dc5");
    expect(fnv1a32("a").toString(16)).toBe("e40c292c");
  });
});

describe("groupId", () => {
  it("is a short prefixed hex string", () => {
    expect(groupId("TimeoutError", "payment gateway timeout")).toMatch(/^g-[0-9a-f]{8}$/);
  });

  it("is the same for the same class and message", () => {
    expect(groupId("TimeoutError", "x")).toBe(groupId("TimeoutError", "x"));
  });

  it("does not let class and message run together", () => {
    expect(groupId("ab", "c")).not.toBe(groupId("a", "bc"));
  });

  it("does not depend on dump order", () => {
    const jobs = [
      makeJob({ errorClass: "TimeoutError", errorMessage: "gateway timeout" }),
      makeJob({ errorClass: "CardDeclined" }),
    ];

    const forward = groupJobs(jobs).map((group) => group.id).sort();
    const reversed = groupJobs([...jobs].reverse()).map((group) => group.id).sort();

    expect(forward).toEqual(reversed);
  });

  it("survives volatile parts of the message", () => {
    const [a] = groupJobs([makeJob({ errorClass: "NotFound", errorMessage: "user 41 not found" })]);
    const [b] = groupJobs([makeJob({ errorClass: "NotFound", errorMessage: "user 977 not found" })]);

    expect(a.id).toBe(b.id);
  });
});
